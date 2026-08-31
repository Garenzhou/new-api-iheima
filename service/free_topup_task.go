package service

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"sync/atomic"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting/operation_setting"

	"github.com/bytedance/gopkg/util/gopool"
	"gorm.io/gorm"
)

const (
	// freeTopupRecheckInterval 任务禁用时仍然要周期性重读配置，
	// 避免管理员在禁用状态下启用后还要等下一个整点才能生效。
	freeTopupRecheckInterval = 5 * time.Minute
)

var (
	freeTopupOnce    sync.Once
	freeTopupRunning atomic.Bool
)

// StartFreeTopupTask 启动每日免费充值后台任务。
//
// Master 节点独占；按 FreeTopupSetting.DailyRunHour/DailyRunMinute
// 在服务器本地时区下每天定点执行一次。同一用户每天最多被补一次
// （由 free_topup_logs 唯一索引兜底并发）。
func StartFreeTopupTask() {
	freeTopupOnce.Do(func() {
		if !common.IsMasterNode {
			return
		}
		gopool.Go(func() {
			logger.LogInfo(context.Background(), "free topup task started")
			runFreeTopupScheduler()
		})
	})
}

// runFreeTopupScheduler 主循环：每轮根据当前配置算出下一个
// 目标时刻 sleep，醒来后跑一次。配置变更（启用 / 改时间）会
// 在下一个周期生效。
func runFreeTopupScheduler() {
	for {
		setting := operation_setting.GetFreeTopupSetting()
		if !setting.Enabled {
			time.Sleep(freeTopupRecheckInterval)
			continue
		}
		wait := timeUntilNextDailyRun(time.Now(), setting.DailyRunHour, setting.DailyRunMinute)
		timer := time.NewTimer(wait)
		<-timer.C
		// 醒来后再读一次配置，避免 sleep 期间被关掉
		setting = operation_setting.GetFreeTopupSetting()
		if !setting.Enabled {
			continue
		}
		runFreeTopupOnce()
	}
}

// timeUntilNextDailyRun 计算距离下一次 [hour:minute] 的时长。
//
// hour / minute 限定在合法区间；越界时使用 0/0 以保证定时器行为可预测。
// 用 !next.After(now) 判定"今天这个时刻已过或正处在这一刻"，需要
// 顺延到明天同一时刻。
//
// 接受 now 作为参数让该函数成为纯函数，方便单测注入固定时钟。
func timeUntilNextDailyRun(now time.Time, hour, minute int) time.Duration {
	if hour < 0 || hour > 23 || minute < 0 || minute > 59 {
		hour, minute = 0, 0
	}
	next := time.Date(now.Year(), now.Month(), now.Day(), hour, minute, 0, 0, now.Location())
	if !next.After(now) {
		next = next.Add(24 * time.Hour)
	}
	return next.Sub(now)
}

func runFreeTopupOnce() {
	if !freeTopupRunning.CompareAndSwap(false, true) {
		return
	}
	defer freeTopupRunning.Store(false)

	ctx := context.Background()
	startedAt := time.Now()
	stats := &model.FreeTopupStats{
		StartedAt: startedAt.Unix(),
	}

	setting := operation_setting.GetFreeTopupSetting()
	if !setting.Enabled {
		stats.FinishedAt = time.Now().Unix()
		stats.DurationMs = time.Since(startedAt).Milliseconds()
		stats.Err = "disabled"
		model.RecordFreeTopupRun(stats)
		return
	}

	batch := setting.BatchSize
	if batch <= 0 {
		batch = model.FreeTopupBatchDefault
	}

	totalScanned := 0
	totalToppedUp := 0
	totalGranted := 0

	for {
		// 扫描一批余额低于阈值的用户 ID。
		// 避免一次拉全表，循环直到本次没有更多待处理。
		ids, err := model.ListLowBalanceUserIDs(setting.ThresholdQuota, batch)
		if err != nil {
			stats.Err = err.Error()
			stats.FinishedAt = time.Now().Unix()
			stats.DurationMs = time.Since(startedAt).Milliseconds()
			model.RecordFreeTopupRun(stats)
			logger.LogWarn(ctx, fmt.Sprintf("free topup task failed to list low-balance users: %v", err))
			return
		}
		if len(ids) == 0 {
			break
		}
		totalScanned += len(ids)

		for _, id := range ids {
			topped, delta, err := model.RunFreeTopupForUser(id, setting.TargetQuota, setting.ThresholdQuota)
			if err != nil {
				// 单个用户失败不影响整体，继续
				if !errors.Is(err, gorm.ErrRecordNotFound) {
					logger.LogWarn(ctx, fmt.Sprintf("free topup user %d failed: %v", id, err))
				}
				continue
			}
			if topped {
				totalToppedUp++
				totalGranted += delta
			}
		}

		if len(ids) < batch {
			break
		}
	}

	stats.UsersScanned = totalScanned
	stats.UsersToppedUp = totalToppedUp
	stats.TotalGranted = totalGranted
	stats.FinishedAt = time.Now().Unix()
	stats.DurationMs = time.Since(startedAt).Milliseconds()
	model.RecordFreeTopupRun(stats)

	if totalToppedUp > 0 {
		logger.LogInfo(ctx, fmt.Sprintf("free topup done: scanned=%d topped=%d granted=%d duration=%dms",
			totalScanned, totalToppedUp, totalGranted, stats.DurationMs))
	}
}

// TriggerFreeTopupNow 供管理端手动触发；非 master 节点也能跑，
// 用于操作员"立即执行一次"按钮。
func TriggerFreeTopupNow() {
	gopool.Go(func() {
		runFreeTopupOnce()
	})
}
