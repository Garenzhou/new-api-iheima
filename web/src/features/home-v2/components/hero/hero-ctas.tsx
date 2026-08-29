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
import { KeyRound, MonitorDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface HeroCtasProps {
  className?: string
}

export function HeroCtas({ className }: HeroCtasProps) {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        'relative flex w-full max-w-md flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-3',
        className
      )}
    >
      <Button
        size='lg'
        className='tr-cta-primary tr-hero-part h-12 w-full rounded-lg bg-neutral-900 px-5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(20,17,15,0.18)] hover:bg-neutral-800 sm:w-auto'
        style={{ '--hero-delay': '360ms' }}
      >
        <KeyRound className='mr-2 size-4' />
        {t('Get API key')}
      </Button>

      <div
        className='tr-hero-part relative w-full pt-2 sm:w-auto sm:pt-0'
        style={{ '--hero-delay': '420ms' }}
      >
        <Button
          size='lg'
          variant='outline'
          className='tr-cta-secondary h-12 w-full rounded-lg border-neutral-900/15 bg-white/80 px-5 text-sm font-semibold text-neutral-900 shadow-[0_1px_2px_rgba(20,17,15,0.04)] backdrop-blur-sm sm:w-auto'
        >
          <MonitorDown className='mr-2 size-4' />
          {t('Download Desktop')}
        </Button>
        <span
          aria-hidden
          className='pointer-events-none absolute top-0 right-3 -translate-y-1/2 rounded-md bg-neutral-900 px-2 py-0.5 text-[10px] font-semibold tracking-wide whitespace-nowrap text-white shadow-[0_2px_6px_rgba(20,17,15,0.25)]'
        >
          {t('One-click setup')}
        </span>
      </div>
    </div>
  )
}
