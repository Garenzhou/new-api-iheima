package operation_setting

import "github.com/QuantumNous/new-api/setting/config"

// PromoSetting 促销栏配置
// 展示给未登录访客的顶部推广条，登录用户不会看到。管理员可在系统设置中
// 修改文案或关闭；前端在用户点击关闭按钮后会把时间戳写到 localStorage，
// 3 天内不再展示，所以后端不持久化"已关闭"状态。
type PromoSetting struct {
	Enabled bool   `json:"enabled"` // 是否启用促销栏
	Text    string `json:"text"`    // 促销栏文案
}

// 默认配置：默认开启，文案按产品要求默认即可注册即获每日 200 次免费请求。
var promoSetting = PromoSetting{
	Enabled: true,
	Text:    "注册即可解锁每日200次的免费请求",
}

func init() {
	// 注册到全局配置管理器，持久化为 promo_setting.enabled / promo_setting.text
	config.GlobalConfig.Register("promo_setting", &promoSetting)
}

// GetPromoSetting 获取促销栏配置
func GetPromoSetting() *PromoSetting {
	return &promoSetting
}

// IsPromoBarEnabled 是否启用促销栏
func IsPromoBarEnabled() bool {
	return promoSetting.Enabled
}

// GetPromoBarText 获取促销栏文案
func GetPromoBarText() string {
	return promoSetting.Text
}
