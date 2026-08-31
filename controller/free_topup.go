package controller

import (
	"net/http"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/operation_setting"

	"github.com/gin-gonic/gin"
)

// FreeTopupStatus 管理员查看"每日免费充值"任务状态
func FreeTopupStatus(c *gin.Context) {
	setting := operation_setting.GetFreeTopupSetting()
	stats := model.GetFreeTopupLastStats()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"enabled":          setting.Enabled,
			"target_quota":     setting.TargetQuota,
			"threshold_quota":  setting.ThresholdQuota,
			"batch_size":       setting.BatchSize,
			"daily_run_hour":   setting.DailyRunHour,
			"daily_run_minute": setting.DailyRunMinute,
			"last_stats":       stats,
		},
	})
}

// FreeTopupTrigger 管理员手动触发一次免费充值任务
func FreeTopupTrigger(c *gin.Context) {
	setting := operation_setting.GetFreeTopupSetting()
	if !setting.Enabled {
		common.ApiErrorMsg(c, "每日免费充值功能未启用")
		return
	}
	// 异步触发，不阻塞 HTTP 返回
	service.TriggerFreeTopupNow()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "已触发，请稍后刷新查看结果",
	})
}
