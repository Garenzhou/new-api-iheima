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
import { ArrowRight, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

interface PromoBannerProps {
  className?: string
}

export function PromoBanner({ className }: PromoBannerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)

  if (!open) return null

  return (
    <div
      className={cn(
        // Blue → violet → purple animated gradient (new-api palette, not openstarry's rust).
        // The gradient slides back and forth on a 7s loop, mirroring openstarry's .promo-banner.
        'relative overflow-hidden text-white',
        'bg-[linear-gradient(90deg,#1e3a8a_0%,#4f46e5_40%,#7c3aed_60%,#1e3a8a_100%)]',
        'bg-[length:200%_100%]',
        'animate-[promo-bg_7s_ease-in-out_infinite]',
        className
      )}
      style={{
        // Custom keyframes live in the global index.css so Tailwind's arbitrary-value
        // JIT can reference them. Mirrors openstarry's @keyframes promoBg.
        animationName: 'promo-bg',
      }}
    >
      <div
        className={cn(
          // Mirrors openstarry's .promo-inner: flex row, gap 18, generous padding, wrap.
          'mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-2 px-6 py-3 md:px-10'
        )}
      >
        <div className='flex flex-wrap items-center gap-2.5'>
          <strong className='text-[15px] font-semibold tracking-tight'>
            {t('Sign up now and instantly receive 200 free model calls')}
          </strong>
          <span className='font-mono text-xs text-white/75'>
            {t('No card required · Never expires')}
          </span>
        </div>

        <a
          href='/sign-up'
          className={cn(
            // Mirrors openstarry's .promo-cta: cream surface, ink text, slight lift on hover.
            'inline-flex shrink-0 items-center gap-1.5 rounded-md bg-white px-5 py-2 font-mono text-[13px] font-semibold text-indigo-900 transition-transform duration-150 hover:-translate-y-px hover:bg-slate-50'
          )}
        >
          <span>{t('Claim now')}</span>
          <ArrowRight className='size-3.5' />
        </a>

        <button
          type='button'
          onClick={() => setOpen(false)}
          aria-label={t('Dismiss promo')}
          className={cn(
            // Mirrors openstarry's .promo-close: ghost button, brighten on hover.
            'shrink-0 rounded-sm p-1 text-white/55 transition-colors duration-150 hover:text-white'
          )}
        >
          <X className='size-4' />
        </button>
      </div>
    </div>
  )
}
