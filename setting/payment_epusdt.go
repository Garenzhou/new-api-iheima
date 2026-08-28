package setting

// Epusdt（USDT 加密货币支付网关）配置，仅支持新版 GMPay 协议
// （github.com/GMWalletApp/epusdt v2，HMAC-SHA256 签名）。
var (
	// EpusdtAddress 网关地址，例如 https://pay.example.com
	EpusdtAddress = ""
	// EpusdtPid 商户 PID（网关后台 api_keys 的 pid）
	EpusdtPid = ""
	// EpusdtAuthToken 商户密钥（网关后台 api_keys 的 secret_key，用于下单与回调验签）
	EpusdtAuthToken = ""
	// EpusdtTradeType 交易类型，格式 token.network，例如 usdt.tron / usdt.erc20
	EpusdtTradeType = "usdt.tron"
	// EpusdtMinTopUp 单次最低充值数量
	EpusdtMinTopUp = 1
)
