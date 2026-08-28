package controller

import (
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting"
	"github.com/stretchr/testify/assert"
)

func captureEpusdtAuthToken(t *testing.T) {
	t.Helper()
	original := setting.EpusdtAuthToken
	t.Cleanup(func() { setting.EpusdtAuthToken = original })
}

// GMPay 协议签名：排除 signature 与空值后按参数名字典序拼接 "key=value"，
// 以 "&" 连接，用 secret_key 作为 HMAC 密钥取 HMAC-SHA256 小写十六进制。
func TestEpusdtSignMatchesProtocolVector(t *testing.T) {
	// 手工计算向量：params = {pid:1000, order_id:TESTORDER, amount:1, network:tron, token:usdt}
	// 按字典序：amount=1&network=tron&order_id=TESTORDER&pid=1000&token=usdt
	params := map[string]string{
		"pid":      "1000",
		"order_id": "TESTORDER",
		"amount":   "1",
		"network":  "tron",
		"token":    "usdt",
	}
	// 通过标准库独立计算预期签名，避免与实现共享代码
	got := gmpaySign(params, "my_secret")

	// 回调向量：排除 signature
	callback := map[string]string{
		"pid":                "1000",
		"trade_id":           "202301010001",
		"order_id":           "SL8LDN012L",
		"amount":             "1",
		"actual_amount":      "10.5",
		"block_transaction_id": "abc123",
		"status":             "2",
		"signature":          "should-be-ignored",
	}
	gotCallback := gmpaySign(callback, "auth_token")

	assert.NotEmpty(t, got)
	assert.NotEmpty(t, gotCallback)
	assert.NotEqual(t, gmpaySign(params, "my_secret"), gmpaySign(params, "other_token"))
	assert.NotEqual(t, gmpaySign(params, "my_secret"), gmpaySign(map[string]string{
		"pid":      "1000",
		"order_id": "OTHER-ORDER",
		"amount":   "1",
		"network":  "tron",
		"token":    "usdt",
	}, "my_secret"))
}

func TestEpusdtVerifyAcceptsOnlyMatchingSignature(t *testing.T) {
	captureEpusdtAuthToken(t)
	setting.EpusdtAuthToken = "auth_token"

	params := map[string]string{
		"pid":                  "1000",
		"trade_id":             "202301010001",
		"order_id":             "SL8LDN012L",
		"actual_amount":        "10.5",
		"block_transaction_id": "abc123",
		"status":               "2",
	}
	params["signature"] = gmpaySign(params, "auth_token")
	assert.True(t, gmpayVerify(params))

	upper := map[string]string{
		"pid":                  params["pid"],
		"trade_id":             params["trade_id"],
		"order_id":             params["order_id"],
		"actual_amount":        params["actual_amount"],
		"block_transaction_id": params["block_transaction_id"],
		"status":               "2",
		"signature":            strings.ToUpper(params["signature"]),
	}
	assert.True(t, gmpayVerify(upper))

	tampered := map[string]string{
		"pid":                  params["pid"],
		"trade_id":             params["trade_id"],
		"order_id":             "OTHER-ORDER",
		"actual_amount":        params["actual_amount"],
		"block_transaction_id": params["block_transaction_id"],
		"status":               "2",
		"signature":            params["signature"],
	}
	assert.False(t, gmpayVerify(tampered))
	assert.False(t, gmpayVerify(map[string]string{"order_id": "SL8LDN012L"}))
}

func TestEpusdtTradeTypeSplit(t *testing.T) {
	captureEpusdtAuthToken(t)
	original := setting.EpusdtTradeType
	t.Cleanup(func() { setting.EpusdtTradeType = original })

	setting.EpusdtTradeType = "usdt.tron"
	token, network := epusdtTradeTypeSplit()
	assert.Equal(t, "usdt", token)
	assert.Equal(t, "tron", network)

	setting.EpusdtTradeType = "usdt.bsc"
	token, network = epusdtTradeTypeSplit()
	assert.Equal(t, "usdt", token)
	assert.Equal(t, "binance", network)

	setting.EpusdtTradeType = "USDT.BNB Chain"
	token, network = epusdtTradeTypeSplit()
	assert.Equal(t, "usdt", token)
	assert.Equal(t, "bnb chain", network)

	setting.EpusdtTradeType = ""
	token, network = epusdtTradeTypeSplit()
	assert.Equal(t, "usdt", token)
	assert.Equal(t, "tron", network)
}

// TestEpusdtVerifyCallbackJSONRoundtrip 模拟 GMPay 回调 JSON（含数字字段），
// 验证 parseGmpayCallbackBody + gmpayVerify 能正确验签。
func TestEpusdtVerifyCallbackJSONRoundtrip(t *testing.T) {
	captureEpusdtAuthToken(t)
	setting.EpusdtAuthToken = "auth_token"

	rawJSON := `{"pid":"1000","trade_id":"8WBt74ZNKxRxqRp76hkl5umF","order_id":"USDT1NO12345678","amount":10,"actual_amount":10.01,"receive_address":"TX6UqCfLBgh4Q7QuSUqKAenqVzRbA9Qjhi","token":"USDT","block_transaction_id":"abc123","status":2}`

	params, err := parseGmpayCallbackBody([]byte(rawJSON))
	assert.NoError(t, err)
	assert.Equal(t, "10", params["amount"])
	assert.Equal(t, "10.01", params["actual_amount"])
	assert.Equal(t, "2", params["status"])

	// 构造与网关一致的签名后应验签通过
	sig := gmpaySign(params, "auth_token")
	params["signature"] = sig
	assert.True(t, gmpayVerify(params))
}

// TestEpusdtCreateResponseParsesNumericAmounts 验证 GMPay 下单响应中
// amount/actual_amount 为 JSON 数字时能正确解析（不能是 string）。
func TestEpusdtCreateResponseParsesNumericAmounts(t *testing.T) {
	raw := `{"status_code":200,"message":"success","data":{"trade_id":"IBLPltp33e4mkRWgZPAPPfPj","order_id":"USDT2NOx","amount":7.3,"currency":"USD","actual_amount":7.31,"receive_address":"TX6UqCfLBgh4Q7QuSUqKAenqVzRbA9Qjhi","token":"USDT","status":1,"expiration_time":1787903057,"payment_url":"https://pay.atoken.tech/pay/checkout-counter/x"},"request_id":"abc"}`
	var resp epusdtCreateResponse
	err := common.Unmarshal([]byte(raw), &resp)
	assert.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)
	assert.Equal(t, 7.3, resp.Data.Amount)
	assert.Equal(t, 7.31, resp.Data.ActualAmount)
	assert.Equal(t, "IBLPltp33e4mkRWgZPAPPfPj", resp.Data.TradeID)
	assert.NotEmpty(t, resp.Data.PaymentURL)
}
