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
import { type SVGProps } from 'react'

import { cn } from '@/lib/utils'

export function IconGoogle({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      role='img'
      viewBox='0 0 24 24'
      xmlns='http://www.w3.org/2000/svg'
      width='24'
      height='24'
      className={cn('[&>path]:stroke-current', className)}
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      {...props}
    >
      <title>Google</title>
      <path strokeWidth='0' d='M0 0h24v24H0z' fill='none' />
      <path d='M12 2a9.96 9.96 0 0 1 6.29 2.226a3.3 3.3 0 0 0 .98 6.805h-.108l-.445 -.015h-.337a3 3 0 0 1 -.585 -.069a3 3 0 0 1 -1.795 -5.303l1.283 -1.105a7.9 7.9 0 1 0 5.07 7.6l.018 -.236l.005 -.143v-.5a2 2 0 0 1 .75 -1.561a1 1 0 0 1 .75 -.188l.5 .1a1 1 0 0 1 .75 1.561a10 10 0 1 1 -13.52 -10.768a10 10 0 0 1 .5 -.304a1 1 0 0 1 .18 -.428z' />
    </svg>
  )
}
