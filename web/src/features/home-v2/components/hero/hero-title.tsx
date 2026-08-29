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

const CHAR_STAGGER_MS = 18
const PART_STAGGER_MS = 220

// `tracking-tight` makes the gradient line read denser and matches the
// reference visual weight. Applied on the gradient segments only so
// it doesn't fight the per-char width of the neutral segments.
const GRADIENT_TEXT =
  'bg-gradient-to-br from-indigo-500 via-violet-600 to-pink-500 bg-clip-text tracking-tight text-transparent'

/**
 * Renders `text` as a sequence of <span> characters, each with its own
 * `tr-hero-char` class and `--char-delay` so the title reveals
 * char-by-char the way the reference site does (home-hero-char with
 * --char-delay). Multi-space runs render as a single non-animated
 * space so the eye groups words.
 */
function StaggeredText({
  text,
  startDelay,
  className,
}: {
  text: string
  startDelay: number
  className?: string
}) {
  const segments = text.split(/(\s+)/)
  let charIndex = 0
  return (
    <span className={className}>
      {segments.map((seg) => {
        if (seg === '' || /^\s+$/.test(seg)) {
          return <span key={`s-${seg}`}>{seg}</span>
        }
        return [...seg].map((ch) => {
          const delay = startDelay + charIndex * CHAR_STAGGER_MS
          charIndex += 1
          return (
            <span
              key={`c-${charIndex}-${ch}`}
              className={cn('tr-hero-char', className)}
              style={{ '--char-delay': `${delay}ms` }}
            >
              {ch}
            </span>
          )
        })
      })}
    </span>
  )
}

export function HeroTitle({ className }: HeroTitleProps) {
  const { t } = useTranslation()
  // Line 1 is split into two visual segments so the brand phrase can
  // wear the gradient while the rest stays neutral, matching the
  // reference site ("The LLM router" in accent, ", built for" in ink).
  const line1Lead = t('The LLM router')
  const line1Tail = t(', built for')
  // Line 2 is one steady accent phrase — no cycling.
  const line2 = t('Claude Code and Codex')

  const line1Delay = 60
  const line2Delay =
    line1Delay +
    (line1Lead + line1Tail).replaceAll(/\s+/g, '').length * CHAR_STAGGER_MS +
    PART_STAGGER_MS

  return (
    <h1
      className={cn(
        'max-w-4xl text-balance text-[32px] leading-[1.15] font-bold tracking-[0] sm:text-[40px] sm:leading-[1.1] md:text-[48px] md:leading-[1.05] lg:text-[56px] lg:leading-[1.05]',
        className
      )}
    >
      <span className='block text-neutral-900'>
        <StaggeredText
          text={line1Lead}
          startDelay={line1Delay}
          className={GRADIENT_TEXT}
        />
        <StaggeredText
          text={line1Tail}
          startDelay={
            line1Delay + line1Lead.replaceAll(/\s+/g, '').length * CHAR_STAGGER_MS
          }
        />
      </span>
      <span className='mt-1 block md:whitespace-nowrap'>
        <StaggeredText text={line2} startDelay={line2Delay} />
      </span>
    </h1>
  )
}
