/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'

import { useAuthStore } from '@/stores/auth-store'
import { useStatus } from '@/hooks/use-status'
import { cn } from '@/lib/utils'

const PROMO_BAR_DISMISS_KEY = 'promo-bar:dismissed-at'
const PROMO_BAR_DISMISS_DAYS = 3
const PROMO_BAR_DISMISS_MS = PROMO_BAR_DISMISS_DAYS * 24 * 60 * 60 * 1000

// Re-exported so the frontend cache wipe (web/src/lib/frontend-cache.ts) can
// preserve this key without duplicating the literal.
export { PROMO_BAR_DISMISS_KEY }

function isDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = window.localStorage.getItem(PROMO_BAR_DISMISS_KEY)
    if (!raw) return false
    const ts = Number(raw)
    if (!Number.isFinite(ts) || ts <= 0) return false
    return Date.now() - ts < PROMO_BAR_DISMISS_MS
  } catch {
    return false
  }
}

function recordDismiss(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      PROMO_BAR_DISMISS_KEY,
      String(Date.now())
    )
  } catch {
    // Storage can be unavailable in private mode; the bar will simply
    // reappear on the next load, which is the correct fallback.
  }
}

interface PromoBarProps {
  className?: string
}

/**
 * Top-of-public-pages promo bar. Only shown to logged-out visitors when the
 * admin has enabled it (via /api/status -> promo_bar_enabled/text). The
 * dismiss X writes a timestamp to localStorage so the bar stays hidden for
 * PROMO_BAR_DISMISS_DAYS; the key is preserved across frontend cache wipes
 * (see PRESERVED_LOCAL_STORAGE_KEYS).
 */
export function PromoBar({ className }: PromoBarProps) {
  const { t } = useTranslation()
  const isAuthenticated = !!useAuthStore((s) => s.auth.user)
  const { status } = useStatus()
  const [mounted, setMounted] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Read the dismiss flag only on the client. SSR would otherwise always see
  // "not dismissed" and the server-rendered HTML would include the bar even
  // for users who have already closed it.
  useEffect(() => {
    setMounted(true)
    setDismissed(isDismissed())
  }, [])

  // When the user signs in/out without a full page reload, mirror the dismiss
  // state into React so we don't briefly show a stale bar.
  useEffect(() => {
    if (!mounted) return
    if (isAuthenticated) {
      setDismissed(true)
    }
  }, [isAuthenticated, mounted])

  if (!mounted) return null
  if (isAuthenticated) return null
  if (dismissed) return null

  const enabled = status?.data?.promo_bar_enabled ?? false
  const text = (status?.data?.promo_bar_text ?? '').trim()
  if (!enabled || !text) return null

  return (
    <div
      role='region'
      aria-label={t('Promo bar')}
      className={cn(
        // Sticks to the top of the public layout, just under the fixed
        // 60px (h-15) header. Sits above page content (z-40) but below
        // modal layers. Mirrors the home-v2 sandboxes' banner styling so
        // visitors see the same gradient regardless of which public
        // page they land on.
        'sticky top-15 z-40 overflow-hidden text-white',
        'bg-[linear-gradient(90deg,#1e3a8a_0%,#4f46e5_40%,#7c3aed_60%,#1e3a8a_100%)]',
        'bg-[length:200%_100%]',
        'animate-[promo-bg_7s_ease-in-out_infinite]',
        className
      )}
      style={{ animationName: 'promo-bg' }}
    >
      <div className='mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2.5 md:px-10'>
        <p className='flex-1 truncate text-center text-sm font-medium tracking-tight md:text-[15px]'>
          {text}
        </p>
        <button
          type='button'
          onClick={() => {
            recordDismiss()
            setDismissed(true)
          }}
          aria-label={t('Dismiss promo')}
          className='shrink-0 rounded-sm p-1 text-white/70 transition-colors duration-150 hover:text-white'
        >
          <X className='size-4' />
        </button>
      </div>
    </div>
  )
}
