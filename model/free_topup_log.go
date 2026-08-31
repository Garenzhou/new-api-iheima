package model

import (
	"errors"
	"fmt"
	"strings"
	"sync/atomic"
	"time"

	"github.com/QuantumNous/new-api/common"
	"gorm.io/gorm"
)

// FreeTopupLog 每日免费充值记录
// 通过 (user_id, topup_date) 唯一索引保证每个用户每天最多被补足一次；
// 即使定时任务在同一天被多次触发（手动触发 + 自动触发并发），
// 唯一索引也会让第二条 INSERT 失败，从而避免重复发奖。
type FreeTopupLog struct {
	Id          int    `json:"id" gorm:"primaryKey;autoIncrement"`
	UserId      int    `json:"user_id" gorm:"not null;uniqueIndex:idx_user_free_topup_date"`
	TopupDate   string `json:"topup_date" gorm:"type:varchar(10);not null;uniqueIndex:idx_user_free_topup_date"` // YYYY-MM-DD
	QuotaBefore int    `json:"quota_before" gorm:"not null"`
	QuotaAfter  int    `json:"quota_after" gorm:"not null"`
	QuotaDelta  int    `json:"quota_delta" gorm:"not null"`
	CreatedAt   int64  `json:"created_at" gorm:"bigint"`
}

func (FreeTopupLog) TableName() string {
	return "free_topup_logs"
}

// freeTopupLastStats 最近一次执行的统计信息
var freeTopupLastStats atomic.Pointer[FreeTopupStats]

// FreeTopupStats 一次免费充值任务执行的统计
type FreeTopupStats struct {
	UsersScanned  int    `json:"users_scanned"`
	UsersToppedUp int    `json:"users_topped_up"`
	TotalGranted  int    `json:"total_granted"`
	StartedAt     int64  `json:"started_at"`
	FinishedAt    int64  `json:"finished_at"`
	DurationMs    int64  `json:"duration_ms"`
	Err           string `json:"err,omitempty"`
}

// creditFreeTopup 给单个用户补足免费额度：插入 free_topup_logs
// 抢占当日配额（唯一索引兜底并发），并给用户 quota 加上 delta。
// 用事务保证两步原子性。SQLite 的事务同样有效——AGENTS.md
// 只限制 SQLite 上的 `FOR UPDATE` 行锁语法，不限制事务。
func creditFreeTopup(userId int, currentQuota int, delta int) error {
	if delta <= 0 {
		return nil
	}
	today := time.Now().Format("2006-01-02")
	logEntry := &FreeTopupLog{
		UserId:      userId,
		TopupDate:   today,
		QuotaBefore: currentQuota,
		QuotaAfter:  currentQuota + delta,
		QuotaDelta:  delta,
		CreatedAt:   time.Now().Unix(),
	}

	err := DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(logEntry).Error; err != nil {
			return err
		}
		if err := tx.Model(&User{}).
			Where("id = ?", userId).
			Update("quota", gorm.Expr("quota + ?", delta)).Error; err != nil {
			return err
		}
		return nil
	})
	if err == nil {
		go func() {
			_ = cacheIncrUserQuota(userId, int64(delta))
		}()
	}
	return err
}

// isUniqueViolation 兜底判断：不同驱动返回的错误信息不同。
// 优先用 gorm.ErrDuplicatedKey，匹配不到再用字符串扫描。
func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	for _, s := range []string{
		"UNIQUE constraint failed",
		"Duplicate entry",
		"duplicate key value",
	} {
		if strings.Contains(msg, s) {
			return true
		}
	}
	return false
}

// RunFreeTopupForUser 是给 service 层调用的单用户入口：
// 读取当前用户 quota，若低于阈值且今日未发，则补足到目标。
// 返回 (toppedUp, delta, err)。
//
// 不在循环里预查 HasFreeTopupToday——唯一索引在并发场景下
// 已经兜底，重复发的 INSERT 会被数据库拒绝并在应用层转成 no-op，
// 少一次 SELECT 反而更便宜。
func RunFreeTopupForUser(userId int, targetQuota int, thresholdQuota int) (bool, int, error) {
	if targetQuota <= 0 || thresholdQuota < 0 {
		return false, 0, nil
	}

	var u User
	if err := DB.Select("id, quota, status, role").First(&u, userId).Error; err != nil {
		return false, 0, err
	}
	if u.Status != common.UserStatusEnabled {
		return false, 0, nil
	}
	// 不给 root / admin 充值，避免对账混乱
	if u.Role >= common.RoleAdminUser {
		return false, 0, nil
	}
	if u.Quota >= thresholdQuota {
		return false, 0, nil
	}

	delta := targetQuota - u.Quota
	if delta <= 0 {
		return false, 0, nil
	}

	if err := creditFreeTopup(userId, u.Quota, delta); err != nil {
		// 唯一索引冲突 = 并发抢先成功了，按"已发放"处理，不算错
		if errors.Is(err, gorm.ErrDuplicatedKey) || isUniqueViolation(err) {
			return false, 0, nil
		}
		return false, 0, err
	}

	// 记录可观测日志
	RecordLog(userId, LogTypeFreeTopup,
		fmt.Sprintf("免费额度自动充值：%d → %d (+%d)", u.Quota, u.Quota+delta, delta))

	return true, delta, nil
}

// RecordFreeTopupRun 保存最近一次任务的统计信息
func RecordFreeTopupRun(s *FreeTopupStats) { freeTopupLastStats.Store(s) }

// GetFreeTopupLastStats 返回最近一次任务统计
func GetFreeTopupLastStats() *FreeTopupStats { return freeTopupLastStats.Load() }

// FreeTopupBatchDefault 默认每批扫描用户数（service 包会读取）。
// 共享给 model 和 service 两层，避免在调用点重复字面量。
const FreeTopupBatchDefault = 200

// ListLowBalanceUserIDs 返回一批余额低于 threshold 的普通用户 ID。
// 排除 root / admin / 已停用账号；只查 status=enabled role=common 的用户，
// 避免给管理员和已封禁账号充免费额度。
//
// 按 id 升序是为了让多次调用之间不漏、不重；service 层按 batch 循环
// 直到返回的 id 列表长度小于 batchSize 即视为扫完。
func ListLowBalanceUserIDs(threshold int, batchSize int) ([]int, error) {
	if batchSize <= 0 {
		batchSize = FreeTopupBatchDefault
	}
	var ids []int
	err := DB.Model(&User{}).
		Where("status = ? AND role = ? AND quota < ?",
			common.UserStatusEnabled, common.RoleCommonUser, threshold).
		Order("id ASC").
		Limit(batchSize).
		Pluck("id", &ids).Error
	return ids, err
}
