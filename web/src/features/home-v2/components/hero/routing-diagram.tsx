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
import {
  Brain,
  Flower2,
  LucideIcon,
  MonitorSmartphone,
  Sparkles,
  TerminalSquare,
  Waves,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

interface NodeItem {
  key: string
  label: string
  Icon: LucideIcon
  iconClass: string
}

const PROVIDERS: NodeItem[] = [
  { key: 'claude', label: 'Claude', Icon: Flower2, iconClass: 'text-orange-500' },
  { key: 'gpt', label: 'GPT', Icon: Brain, iconClass: 'text-emerald-500' },
  { key: 'gemini', label: 'Gemini', Icon: Sparkles, iconClass: 'text-sky-500' },
  { key: 'deepseek', label: 'DeepSeek', Icon: Waves, iconClass: 'text-indigo-500' },
]

const AGENTS: NodeItem[] = [
  {
    key: 'claude-code',
    label: 'Claude Code',
    Icon: TerminalSquare,
    iconClass: 'text-orange-500',
  },
  { key: 'codex', label: 'Codex', Icon: Brain, iconClass: 'text-blue-500' },
  { key: 'cline', label: 'Cline', Icon: Sparkles, iconClass: 'text-pink-500' },
  {
    key: 'opencode',
    label: 'OpenCode',
    Icon: MonitorSmartphone,
    iconClass: 'text-violet-500',
  },
]

const LINE_COLORS = [
  'stroke-indigo-400/70',
  'stroke-violet-400/70',
  'stroke-pink-400/70',
  'stroke-sky-400/70',
]

/**
 * Layout strategy:
 *
 * The diagram is one wide, short row. Internally:
 *  - left 25%: providers stacked top-to-bottom
 *  - middle 12%: hub circle (vertically centered)
 *  - right 25%: agents stacked top-to-bottom
 *  - gap between column and hub: filled with curved SVG lines that
 *    start at each card's row and converge on the hub.
 *
 * Everything sits on the same row's flexbox so vertical alignment is
 * automatic. The SVG is positioned absolutely over the gap, sized to the
 * gap's actual pixel dimensions, and uses viewBox so curve math is
 * independent of layout.
 */
export function RoutingDiagram({ className }: { className?: string }) {
  const { t } = useTranslation()
  return (
    <div className={cn('relative w-full', className)}>
      {/* Tablet+ (≥ md) */}
      <div className='hidden w-full items-center md:flex'>
        <SideLabel align='left' text={t('Model Providers')} />

        <div className='relative flex flex-1 items-center'>
          <div className='flex shrink-0 flex-col items-start gap-2.5'>
            {PROVIDERS.map((p) => (
              <Card key={p.key} item={p} />
            ))}
          </div>

          <SpokeSvg
            className='h-[196px] flex-1'
            side='left'
            count={PROVIDERS.length}
          />

          <Hub
            sizeClass='size-16 lg:size-20'
            iconClass='size-6 lg:size-7'
            label={t('Smart Routing')}
          />

          <SpokeSvg
            className='h-[196px] flex-1'
            side='right'
            count={AGENTS.length}
          />

          <div className='flex shrink-0 flex-col items-end gap-2.5'>
            {AGENTS.map((a) => (
              <Card key={a.key} item={a} />
            ))}
          </div>
        </div>

        <SideLabel align='right' text={t('Coding Agents & Clients')} />
      </div>

      {/* Mobile (< md) */}
      <div className='flex flex-col items-center gap-4 md:hidden'>
        <StackColumn title={t('Model Providers')} items={PROVIDERS} />
        <MobileHub label={t('Smart Routing')} />
        <StackColumn title={t('Coding Agents & Clients')} items={AGENTS} />
      </div>

      <p className='mt-6 text-center text-[12px] text-neutral-500 md:mt-8'>
        {t('Works with 10+ coding agents and clients')}
      </p>
    </div>
  )
}

/* --- shared bits --- */

function SideLabel({ align, text }: { align: 'left' | 'right'; text: string }) {
  return (
    <div
      className={cn(
        'hidden shrink-0 items-center gap-1.5 px-3 text-[10px] font-semibold tracking-[0.18em] text-neutral-500 uppercase md:flex',
        align === 'right' && 'flex-row-reverse'
      )}
    >
      <span aria-hidden className='inline-block size-1.5 bg-neutral-400' />
      <span className='whitespace-nowrap'>{text}</span>
    </div>
  )
}

function Hub({
  sizeClass,
  iconClass,
  label,
}: {
  sizeClass: string
  iconClass: string
  label: string
}) {
  return (
    <div
      className='relative z-10 flex shrink-0 flex-col items-center gap-2'
      aria-label={label}
    >
      <div
        aria-hidden
        className={cn(
          'relative flex items-center justify-center rounded-full bg-gradient-to-br from-orange-300 via-orange-400 to-pink-400 shadow-[0_8px_24px_rgba(251,113,133,0.35)]',
          sizeClass
        )}
      >
        <div className='absolute inset-1 rounded-full bg-gradient-to-br from-white/40 to-transparent' />
        <RouterGlyph
          className={cn('relative z-10 text-white drop-shadow', iconClass)}
        />
      </div>
      <div className='flex items-center gap-1.5 text-[12px] text-neutral-600'>
        <span
          aria-hidden
          className='inline-block size-1.5 rounded-full bg-orange-500 shadow-[0_0_0_3px_rgba(249,115,22,0.18)]'
        />
        <span className='font-medium'>{label}</span>
      </div>
    </div>
  )
}

function MobileHub({ label }: { label: string }) {
  return (
    <div className='flex flex-col items-center gap-2' aria-label={label}>
      <div
        aria-hidden
        className='relative flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-orange-300 via-orange-400 to-pink-400 shadow-[0_6px_18px_rgba(251,113,133,0.35)]'
      >
        <div className='absolute inset-1 rounded-full bg-gradient-to-br from-white/40 to-transparent' />
        <RouterGlyph className='relative z-10 size-5 text-white drop-shadow' />
      </div>
      <div className='flex items-center gap-1.5 text-[12px] text-neutral-600'>
        <span
          aria-hidden
          className='inline-block size-1.5 rounded-full bg-orange-500 shadow-[0_0_0_3px_rgba(249,115,22,0.18)]'
        />
        <span className='font-medium'>{label}</span>
      </div>
    </div>
  )
}

function SpokeSvg({
  side,
  count,
  className,
}: {
  side: 'left' | 'right'
  count: number
  className?: string
}) {
  // The SVG covers the gap between a column and the hub. The viewBox
  // is square so the layout keeps its proportions regardless of the
  // gap's actual width; preserveAspectRatio='xMidYMid meet' so the
  // viewBox isn't stretched.
  const VB_W = 100
  const VB_H = 100
  // Curves are anchored at 4 evenly-spaced y positions, all on the
  // hub-side half. The visual effect is a "splayed tail" that
  // converges onto the hub circle.
  const padY = 22
  const usable = VB_H - padY * 2
  const step = count > 1 ? usable / (count - 1) : 0
  const ys: number[] = []
  for (let i = 0; i < count; i++) ys.push(padY + i * step)
  const drawYs = side === 'right' ? [...ys].reverse() : ys
  const startX = side === 'left' ? 0 : VB_W
  const endX = side === 'left' ? VB_W : 0
  // Pull control points close to the endpoints so the curve stays
  // mostly horizontal (matches the reference).
  const cp1X = side === 'left' ? 20 : VB_W - 20
  const cp2X = side === 'left' ? VB_W - 20 : 20
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio='xMidYMid meet'
      className={cn('relative z-0 block w-full', className)}
    >
      {drawYs.map((y, i) => (
        <path
          key={i}
          d={`M ${startX} ${y} C ${cp1X} ${y}, ${cp2X} 50, ${endX} 50`}
          fill='none'
          strokeWidth={1.2}
          strokeLinecap='round'
          vectorEffect='non-scaling-stroke'
          className={cn(LINE_COLORS[i % LINE_COLORS.length], 'opacity-90')}
        />
      ))}
    </svg>
  )
}

function Card({ item }: { item: NodeItem }) {
  const { t } = useTranslation()
  return (
    <div className='flex items-center gap-2.5 rounded-lg border border-black/5 bg-white/85 px-3 py-2 shadow-[0_1px_2px_rgba(15,15,15,0.04)] backdrop-blur-sm'>
      <item.Icon className={cn('size-4', item.iconClass)} />
      <span className='text-[13px] font-semibold text-neutral-800'>
        {t(item.label)}
      </span>
    </div>
  )
}

function StackColumn({ title, items }: { title: string; items: NodeItem[] }) {
  const { t } = useTranslation()
  return (
    <div className='flex w-full flex-col items-stretch gap-2.5'>
      <div className='flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.18em] text-neutral-500 uppercase'>
        <span aria-hidden className='inline-block size-1.5 bg-neutral-400' />
        <span>{t(title)}</span>
      </div>
      <ul className='flex flex-col gap-2'>
        {items.map((item) => (
          <li key={item.key}>
            <Card item={item} />
          </li>
        ))}
      </ul>
    </div>
  )
}

function RouterGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={1.6}
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}
      aria-hidden
    >
      <rect x='3' y='13' width='6' height='6' rx='1' />
      <rect x='15' y='13' width='6' height='6' rx='1' />
      <path d='M6 13V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5' />
      <path d='M9 16h6' />
    </svg>
  )
}
