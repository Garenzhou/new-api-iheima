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
        'tr-pill tr-hero-part inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[19.5px] text-neutral-800',
        className
      )}
    >
      <span aria-hidden className='tr-pill-dot inline-block size-1.5 rounded-full' />
      <span className='font-medium tracking-tight'>
        {t('Same models. Up to 92% off.')}
      </span>
    </div>
  )
}
