package setting

// Epusdt（USDT 加密货币支付网关，兼容 epusdt/bepusdt 协议）配置。
var (
	// EpusdtAddress 网关地址，例如 https://pay.example.com
	EpusdtAddress = ""
	// EpusdtAuthToken 网关的 api auth token（用于下单与回调验签）
	EpusdtAuthToken = ""
	// EpusdtTradeType 交易类型，例如 usdt.trc20 / usdt.erc20
	EpusdtTradeType = "usdt.trc20"
	// EpusdtMinTopUp 单次最低充值数量
	EpusdtMinTopUp = 1
)
