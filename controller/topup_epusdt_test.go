package controller

import (
	"strings"
	"testing"

	"github.com/QuantumNous/new-api/setting"
	"github.com/stretchr/testify/assert"
)

func captureEpusdtAuthToken(t *testing.T) {
	t.Helper()
	original := setting.EpusdtAuthToken
	t.Cleanup(func() { setting.EpusdtAuthToken = original })
}

// epusdt 协议签名：按参数名字典序拼接 "key=value"，以 "&" 连接，
// 末尾直接拼接 auth token 后取 MD5 小写十六进制。
func TestEpusdtSignMatchesProtocolVector(t *testing.T) {
	// 已知向量：md5("amount=1&order_id=TESTORDER&trade_type=usdt.trc20" + "my_secret")
	params := map[string]string{
		"trade_type": "usdt.trc20",
		"order_id":   "TESTORDER",
		"amount":     "1",
	}
	assert.Equal(t, "ddb3b5e960069abfab8f2e383f0b2f68", epusdtSign(params, "my_secret"))

	// 回调向量：md5("amount=10.5&order_id=SL8LDN012L&trade_id=202301010001" + "auth_token")
	callback := map[string]string{
		"trade_id":  "202301010001",
		"order_id":  "SL8LDN012L",
		"amount":    "10.5",
		"signature": "should-be-ignored",
	}
	assert.Equal(t, "146e18557ead0f5cf871cb6b85748521", epusdtSign(callback, "auth_token"))

	assert.NotEqual(t, epusdtSign(params, "my_secret"), epusdtSign(params, "other_token"))
	assert.NotEqual(t, epusdtSign(params, "my_secret"), epusdtSign(map[string]string{
		"trade_type": "usdt.trc20",
		"order_id":   "OTHER-ORDER",
		"amount":     "1",
	}, "my_secret"))
}

func TestEpusdtVerifyAcceptsOnlyMatchingSignature(t *testing.T) {
	captureEpusdtAuthToken(t)
	setting.EpusdtAuthToken = "auth_token"

	params := map[string]string{
		"trade_id":             "202301010001",
		"order_id":             "SL8LDN012L",
		"actual_amount":        "10.5",
		"block_transaction_id": "abc123",
		"status":               "2",
	}
	params["signature"] = epusdtSign(params, "auth_token")
	assert.True(t, epusdtVerify(params))

	upper := map[string]string{
		"trade_id":             params["trade_id"],
		"order_id":             params["order_id"],
		"actual_amount":        params["actual_amount"],
		"block_transaction_id": params["block_transaction_id"],
		"status":               "2",
		"signature":            strings.ToUpper(params["signature"]),
	}
	assert.True(t, epusdtVerify(upper))

	tampered := map[string]string{
		"trade_id":             params["trade_id"],
		"order_id":             "OTHER-ORDER",
		"actual_amount":        params["actual_amount"],
		"block_transaction_id": params["block_transaction_id"],
		"status":               "2",
		"signature":            params["signature"],
	}
	assert.False(t, epusdtVerify(tampered))
	assert.False(t, epusdtVerify(map[string]string{"order_id": "SL8LDN012L"}))
}
