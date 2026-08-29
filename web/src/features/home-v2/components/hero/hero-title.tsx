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

interface HeroTitleProps {
  className?: string
}

export function HeroTitle({ className }: HeroTitleProps) {
  const { t } = useTranslation()
  return (
    <h1
      className={cn(
        'max-w-4xl text-balance text-[32px] leading-[1.15] font-bold tracking-tight sm:text-[40px] sm:leading-[1.1] md:text-[48px] md:leading-[1.05] lg:text-[56px] lg:leading-[1.05]',
        className
      )}
    >
      <span className='block text-neutral-900'>
        {t('A unified LLM gateway built for')}
      </span>
      <span className='mt-1 block md:whitespace-nowrap'>
        <span className='bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 bg-clip-text text-transparent'>
          {t('Claude Code')}
        </span>
        <span className='text-neutral-900'>{' & '}</span>
        <span className='bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500 bg-clip-text text-transparent'>
          {t('every agent you ship')}
        </span>
      </span>
    </h1>
  )
}
