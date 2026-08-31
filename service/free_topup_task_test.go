package service

import (
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestTimeUntilNextDailyRun(t *testing.T) {
	// Anchor the wall clock so the test is deterministic across timezones.
	// 2026-03-15 is a Sunday in UTC — a neutral weekday for the assertions.
	loc, err := time.LoadLocation("UTC")
	require.NoError(t, err)

	type tc struct {
		name      string
		now       time.Time
		hour      int
		minute    int
		wantNear  time.Duration // expected duration, compared with tolerance
		tolerance time.Duration
	}

	cases := []tc{
		{
			name: "slot in the future today",
			now:  time.Date(2026, 3, 15, 6, 30, 0, 0, loc),
			hour: 9, minute: 0,
			wantNear: 2*time.Hour + 30*time.Minute, tolerance: time.Second,
		},
		{
			name: "slot in the past today rolls to tomorrow",
			now:  time.Date(2026, 3, 15, 6, 30, 0, 0, loc),
			hour: 3, minute: 0,
			wantNear: 20*time.Hour + 30*time.Minute, tolerance: time.Second,
		},
		{
			name: "slot exactly equal to now rolls to tomorrow",
			now:  time.Date(2026, 3, 15, 0, 0, 0, 0, loc),
			hour: 0, minute: 0,
			wantNear: 24 * time.Hour, tolerance: time.Second,
		},
		{
			name: "midnight slot later same day",
			now:  time.Date(2026, 3, 15, 23, 59, 0, 0, loc),
			hour: 0, minute: 0,
			wantNear: 1 * time.Minute, tolerance: time.Second,
		},
		{
			name: "invalid hour falls back to 0:0 tomorrow",
			now:  time.Date(2026, 3, 15, 6, 0, 0, 0, loc),
			hour: 25, minute: 0,
			wantNear: 18 * time.Hour, tolerance: time.Second,
		},
		{
			name: "invalid minute falls back to 0:0",
			now:  time.Date(2026, 3, 15, 6, 0, 0, 0, loc),
			hour: 9, minute: 99,
			wantNear: 3 * time.Hour, tolerance: time.Second,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := timeUntilNextDailyRun(c.now, c.hour, c.minute)
			require.InDelta(t, c.wantNear, got, float64(c.tolerance),
				"expected ~%v, got %v", c.wantNear, got)
		})
	}
}
