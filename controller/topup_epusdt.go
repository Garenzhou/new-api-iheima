package controller

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
)

// epusdtPaidStatus 表示网关回调中“已支付”状态（GMPay 协议 status=2）。
const epusdtPaidStatus = "2"

// epusdtCreateResponse 解析 GMPay 下单响应：{"status_code":200,"message":"success","data":{...},"request_id":...}。
type epusdtCreateResponse struct {
	StatusCode int    `json:"status_code"`
	Code       int    `json:"code"`
	Message    string `json:"message"`
	Data       struct {
		TradeID        string  `json:"trade_id"`
		OrderID        string  `json:"order_id"`
		Amount         float64 `json:"amount"`
		Currency       string  `json:"currency"`
		ActualAmount   float64 `json:"actual_amount"`
		ReceiveAddress string  `json:"receive_address"`
		Token          string  `json:"token"`
		Status         int     `json:"status"`
		ExpirationTime int64   `json:"expiration_time"`
		PaymentURL     string  `json:"payment_url"`
	} `json:"data"`
}

// gmpaySign 按 GMPay 协议计算签名：
// 排除 signature 与空值后，按参数名字典序拼接 "key=value"，以 "&" 连接，
// 使用 secret_key 作为 HMAC 密钥，取 HMAC-SHA256 小写十六进制。
func gmpaySign(params map[string]string, secretKey string) string {
	keys := make([]string, 0, len(params))
	for key := range params {
		if key == "signature" || params[key] == "" {
			continue
		}
		keys = append(keys, key)
	}
	sort.Strings(keys)

	pairs := make([]string, 0, len(keys))
	for _, key := range keys {
		pairs = append(pairs, key+"="+params[key])
	}
	mac := hmac.New(sha256.New, []byte(secretKey))
	_, _ = mac.Write([]byte(strings.Join(pairs, "&")))
	return hex.EncodeToString(mac.Sum(nil))
}

func gmpayVerify(params map[string]string) bool {
	token := setting.EpusdtAuthToken
	signature := params["signature"]
	if signature == "" || token == "" {
		return false
	}
	expected := gmpaySign(params, token)
	return strings.EqualFold(signature, expected)
}

func epusdtGatewayAddress() string {
	return strings.TrimRight(strings.TrimSpace(setting.EpusdtAddress), "/")
}

func isEpusdtConfigured() bool {
	return epusdtGatewayAddress() != "" &&
		strings.TrimSpace(setting.EpusdtPid) != "" &&
		strings.TrimSpace(setting.EpusdtAuthToken) != ""
}

// epusdtTradeTypeSplit 将 "usdt.tron" 拆为 token=usdt、network=tron。
// 非 "token.network" 格式时回退默认 usdt.tron。
func epusdtTradeTypeSplit() (token string, network string) {
	raw := strings.TrimSpace(setting.EpusdtTradeType)
	if raw == "" {
		raw = "usdt.tron"
	}
	parts := strings.SplitN(raw, ".", 2)
	token = strings.ToLower(strings.TrimSpace(parts[0]))
	if len(parts) == 2 {
		network = strings.ToLower(strings.TrimSpace(parts[1]))
	}
	if token == "" {
		token = "usdt"
	}
	if network == "" {
		network = "tron"
	}
	// epusdt GMPay 协议用 binance 标识 BSC 链，把用户常见的 bsc 别名归一化
	if network == "bsc" {
		network = "binance"
	}
	return token, network
}

func RequestEpusdt(c *gin.Context) {
	var req EpayRequest
	err := c.ShouldBindJSON(&req)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}
	minTopup := getMinTopup()
	if int64(setting.EpusdtMinTopUp) > minTopup {
		minTopup = int64(setting.EpusdtMinTopUp)
	}
	if req.Amount < minTopup {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", minTopup)})
		return
	}
	id := c.GetInt("id")
	if rejectInvalidTopUpQuota(c, id, req.Amount) {
		return
	}

	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "获取用户分组失败"})
		return
	}
	payMoney := getPayMoney(req.Amount, group)
	if payMoney < 0.01 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}

	if !isEpusdtConfigured() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "当前管理员未配置支付信息"})
		return
	}

	callBackAddress := service.GetCallbackAddress()
	notifyUrl, _ := url.Parse(callBackAddress + "/api/user/epusdt/notify")
	redirectUrl, _ := url.Parse(paymentReturnPath("/usage-logs"))
	tradeNo := fmt.Sprintf("%s%d", common.GetRandomString(6), time.Now().Unix())
	tradeNo = fmt.Sprintf("USDT%dNO%s", id, tradeNo)

	// 先落本地待支付订单，再向网关下单：若网关下单失败则将本地订单置为失败，
	// 避免出现“用户持有可用收款单但本地无订单”的无法入账窗口。
	topUpAmount := req.Amount
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		dAmount := decimal.NewFromInt(topUpAmount)
		dQuotaPerUnit := decimal.NewFromFloat(common.QuotaPerUnit)
		topUpAmount = dAmount.Div(dQuotaPerUnit).IntPart()
	}
	topUp := &model.TopUp{
		UserId:          id,
		Amount:          topUpAmount,
		Money:           payMoney,
		TradeNo:         tradeNo,
		PaymentMethod:   model.PaymentMethodUsdt,
		PaymentProvider: model.PaymentProviderEpusdt,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	err = topUp.Insert()
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("epusdt 创建充值订单失败 user_id=%d trade_no=%s amount=%d error=%q", id, tradeNo, req.Amount, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "创建订单失败"})
		return
	}

	expireLocalOrder := func(reason string) {
		if expireErr := model.UpdatePendingTopUpStatus(tradeNo, model.PaymentProviderEpusdt, common.TopUpStatusFailed); expireErr != nil {
			logger.LogError(c.Request.Context(), fmt.Sprintf("epusdt 回滚本地订单失败 trade_no=%s reason=%s error=%q", tradeNo, reason, expireErr.Error()))
		}
	}

	token, network := epusdtTradeTypeSplit()
	// 网关按 JSON 数字解析 amount；签名时按 Go 的 strconv.FormatFloat(f,'f',-1,64)
	// 规范化成字符串（与网关 util/sign.MapToParams 一致），例如 10.00 -> "10"。
	amount := decimal.NewFromFloat(payMoney).Round(2)
	amountFloat, _ := amount.Float64()
	amountSignStr := strconv.FormatFloat(amountFloat, 'f', -1, 64)

	signParams := map[string]string{
		"pid":          setting.EpusdtPid,
		"order_id":     tradeNo,
		"currency":     "usd",
		"token":        token,
		"network":      network,
		"amount":       amountSignStr,
		"notify_url":   notifyUrl.String(),
		"redirect_url": redirectUrl.String(),
		"name":         "USDT topup",
	}
	signature := gmpaySign(signParams, setting.EpusdtAuthToken)

	payload := map[string]interface{}{
		"pid":          setting.EpusdtPid,
		"order_id":     tradeNo,
		"currency":     "usd",
		"token":        token,
		"network":      network,
		"amount":       amountFloat,
		"notify_url":   notifyUrl.String(),
		"redirect_url": redirectUrl.String(),
		"name":         "USDT topup",
		"signature":    signature,
	}

	gateway := epusdtGatewayAddress() + "/payments/gmpay/v1/order/create-transaction"
	body, err := postEpusdtCreateTransaction(c, gateway, payload)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("epusdt 拉起支付失败 user_id=%d trade_no=%s amount=%d error=%q body=%q", id, tradeNo, req.Amount, err.Error(), string(body)))
		expireLocalOrder("gateway request failed")
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}
	var createResp epusdtCreateResponse
	if err = common.Unmarshal(body, &createResp); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("epusdt 解析响应失败 user_id=%d trade_no=%s body=%q error=%q", id, tradeNo, string(body), err.Error()))
		expireLocalOrder("invalid gateway response")
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}
	success := createResp.StatusCode == http.StatusOK || createResp.Code == http.StatusOK
	if !success || createResp.Data.PaymentURL == "" {
		logger.LogError(c.Request.Context(), fmt.Sprintf("epusdt 下单失败 user_id=%d trade_no=%s status_code=%d code=%d message=%q body=%q", id, tradeNo, createResp.StatusCode, createResp.Code, createResp.Message, string(body)))
		expireLocalOrder("gateway rejected order")
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("epusdt 充值订单创建成功 user_id=%d trade_no=%s trade_id=%s amount=%d money=%.2f payment_url=%q", id, tradeNo, createResp.Data.TradeID, req.Amount, payMoney, createResp.Data.PaymentURL))
	c.JSON(http.StatusOK, gin.H{"message": "success", "data": gin.H{
		"payment_url": createResp.Data.PaymentURL,
		"trade_no":    tradeNo,
	}, "url": createResp.Data.PaymentURL})
}

// postEpusdtCreateTransaction 以 JSON body 调用网关下单接口（GMPay 按 JSON 绑定参数）。
func postEpusdtCreateTransaction(c *gin.Context, gateway string, payload map[string]interface{}) ([]byte, error) {
	body, err := common.Marshal(payload)
	if err != nil {
		return nil, err
	}
	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodPost, gateway, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(io.LimitReader(resp.Body, 64*1024))
}

// parseGmpayCallbackBody 将 GMPay 回调 JSON body 解析为 string map，
// JSON 数字按 Go 的 strconv.FormatFloat(f,'f',-1,64) 规范化成字符串，
// 与网关签名算法 util/sign.MapToParams 保持一致，保证验签通过。
func parseGmpayCallbackBody(body []byte) (map[string]string, error) {
	var raw map[string]interface{}
	if err := common.Unmarshal(body, &raw); err != nil {
		return nil, err
	}
	out := make(map[string]string, len(raw))
	for key, value := range raw {
		out[key] = gmpayStringifyValue(value)
	}
	return out, nil
}

// gmpayStringifyValue 将回调中的 JSON 值转成签名用字符串：
// float64 -> strconv.FormatFloat(f,'f',-1,64)；其余直接 fmt.Sprintf。
func gmpayStringifyValue(value interface{}) string {
	switch v := value.(type) {
	case float64:
		return strconv.FormatFloat(v, 'f', -1, 64)
	case float32:
		return strconv.FormatFloat(float64(v), 'f', -1, 64)
	case string:
		return v
	default:
		return fmt.Sprintf("%v", v)
	}
}

func EpusdtNotify(c *gin.Context) {
	if !isEpusdtWebhookEnabled() {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("epusdt webhook 被拒绝 reason=webhook_disabled path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	// 网关以 POST + JSON body 发送支付回调（GET query 仅作兼容兜底）。
	// 回调里 amount/actual_amount 等是 JSON 数字，需按 Go 的 float 格式化
	// 转成字符串（与网关 util/sign.MapToParams 一致），否则无法正确验签。
	params := make(map[string]string, len(c.Request.URL.Query()))
	for key := range c.Request.URL.Query() {
		params[key] = c.Request.URL.Query().Get(key)
	}
	if c.Request.Method == http.MethodPost {
		body, err := io.ReadAll(io.LimitReader(c.Request.Body, 64*1024))
		if err != nil {
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("epusdt webhook 读取请求体失败 path=%q client_ip=%s error=%q", c.Request.RequestURI, c.ClientIP(), err.Error()))
			_, _ = c.Writer.Write([]byte("fail"))
			return
		}
		if len(body) > 0 {
			bodyParams, err := parseGmpayCallbackBody(body)
			if err != nil {
				logger.LogWarn(c.Request.Context(), fmt.Sprintf("epusdt webhook 解析请求体失败 path=%q client_ip=%s body=%q error=%q", c.Request.RequestURI, c.ClientIP(), string(body), err.Error()))
				_, _ = c.Writer.Write([]byte("fail"))
				return
			}
			for key, value := range bodyParams {
				params[key] = value
			}
		}
	}
	logger.LogInfo(c.Request.Context(), fmt.Sprintf("epusdt webhook 收到请求 path=%q client_ip=%s method=%s params=%q", c.Request.RequestURI, c.ClientIP(), c.Request.Method, common.GetJsonString(params)))

	tradeNo := params["order_id"]
	if tradeNo == "" {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("epusdt webhook 参数缺失 order_id path=%q client_ip=%s", c.Request.RequestURI, c.ClientIP()))
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	if status, ok := params["status"]; ok && status != epusdtPaidStatus {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("epusdt webhook 忽略非支付状态事件 trade_no=%s status=%s client_ip=%s", tradeNo, status, c.ClientIP()))
		_, _ = c.Writer.Write([]byte("ok"))
		return
	}
	if !gmpayVerify(params) {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("epusdt webhook 验签失败 trade_no=%s client_ip=%s params=%q", tradeNo, c.ClientIP(), common.GetJsonString(params)))
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}

	// 进程内锁只是优化；重复/并发回调的正确性由 RechargeEpusdt 的
	// 数据库行锁 + 事务内状态校验保证（多实例部署下同样安全）。
	LockOrder(tradeNo)
	defer UnlockOrder(tradeNo)
	alreadyDone, err := model.RechargeEpusdt(tradeNo, c.ClientIP())
	if err != nil {
		switch {
		case errors.Is(err, model.ErrTopUpNotFound):
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("epusdt 回调订单不存在 trade_no=%s client_ip=%s", tradeNo, c.ClientIP()))
		case errors.Is(err, model.ErrPaymentMethodMismatch):
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("epusdt 订单支付网关不匹配 trade_no=%s client_ip=%s", tradeNo, c.ClientIP()))
		case errors.Is(err, model.ErrTopUpStatusInvalid):
			logger.LogWarn(c.Request.Context(), fmt.Sprintf("epusdt 订单状态非法 trade_no=%s client_ip=%s", tradeNo, c.ClientIP()))
		default:
			logger.LogError(c.Request.Context(), fmt.Sprintf("epusdt 充值处理失败 trade_no=%s client_ip=%s error=%q", tradeNo, c.ClientIP(), err.Error()))
		}
		_, _ = c.Writer.Write([]byte("fail"))
		return
	}
	if alreadyDone {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("epusdt 重复回调幂等忽略 trade_no=%s client_ip=%s", tradeNo, c.ClientIP()))
	} else {
		logger.LogInfo(c.Request.Context(), fmt.Sprintf("epusdt 充值成功 trade_no=%s client_ip=%s block_transaction_id=%s actual_amount=%s", tradeNo, c.ClientIP(), params["block_transaction_id"], params["actual_amount"]))
	}
	_, _ = c.Writer.Write([]byte("ok"))
}
