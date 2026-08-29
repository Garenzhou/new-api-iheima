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
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

interface HeroPillProps {
  className?: string
}

export function HeroPill({ className }: HeroPillProps) {
  const { t } = useTranslation()
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-3.5 py-1.5 text-[13px] text-neutral-700 shadow-[0_1px_2px_rgba(15,15,15,0.04)] backdrop-blur-sm',
        className
      )}
    >
      <span
        aria-hidden
        className='inline-block size-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]'
      />
      <span className='font-medium'>{t('40+ Official Models · up to 90% off')}</span>
    </div>
  )
}
