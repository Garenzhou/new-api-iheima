package operation_setting

import "github.com/QuantumNous/new-api/setting/config"

// FreeTopupSetting 每日免费充值配置
// 对余额低于阈值的用户每天自动补足到目标额度，确保用户始终拥有一次
// 免费模型调用的额度；通常与一个低价/免费模型搭配使用，实现"每日
// 200 次免费调用"等运营策略。
//
// 单位说明：TargetQuota / ThresholdQuota 都是 int quota units。
// 在默认 QuotaPerUnit = 500000 的情况下，5000 units ≈ $0.01；
// 若管理员设置一个 25 units/request 的免费模型，5000 units
// 即可支撑 200 次请求。
//
// 时段说明：DailyRunHour / DailyRunMinute 是服务器本地时区下
// 每天几点几分执行一次。默认 0:00；操作员可改为 09:00 等任意
// 整点附近的时刻。任务体执行不会因为时段微调而漏跑：当时段变更
// 后，下一轮从下一个匹配点开始执行。
type FreeTopupSetting struct {
	Enabled        bool `json:"enabled"`         // 是否启用每日免费充值
	TargetQuota    int  `json:"target_quota"`    // 补足到多少 quota units
	ThresholdQuota int  `json:"threshold_quota"` // 余额低于该值才补
	BatchSize      int  `json:"batch_size"`      // 每轮最多处理用户数
	DailyRunHour   int  `json:"daily_run_hour"`  // 每日执行时刻（小时，0-23）
	DailyRunMinute int  `json:"daily_run_minute"` // 每日执行时刻（分钟，0-59）
}

// 默认配置：默认开启，目标 5000 units（≈ $0.01），低于 5000 即补，
// 每轮 200 人，每天本地时间 00:00 跑一次。
var freeTopupSetting = FreeTopupSetting{
	Enabled:        true,
	TargetQuota:    5000,
	ThresholdQuota: 5000,
	BatchSize:      200,
	DailyRunHour:   0,
	DailyRunMinute: 0,
}

func init() {
	// 注册到全局配置管理器，持久化为 free_topup_setting.{enabled,target_quota,...}
	config.GlobalConfig.Register("free_topup_setting", &freeTopupSetting)
}

// GetFreeTopupSetting 获取每日免费充值配置
func GetFreeTopupSetting() *FreeTopupSetting {
	return &freeTopupSetting
}

// IsFreeTopupEnabled 是否启用每日免费充值
func IsFreeTopupEnabled() bool {
	return freeTopupSetting.Enabled
}

// GetFreeTopupTargetQuota 获取补足目标 quota
func GetFreeTopupTargetQuota() int {
	return freeTopupSetting.TargetQuota
}

// GetFreeTopupThresholdQuota 获取触发阈值
func GetFreeTopupThresholdQuota() int {
	return freeTopupSetting.ThresholdQuota
}
