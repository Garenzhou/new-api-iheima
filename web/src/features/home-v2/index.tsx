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
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Construction, Sparkles } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Footer } from '@/components/layout/components/footer'
import { PublicLayout } from '@/components/layout/components/public-layout'
import { Button } from '@/components/ui/button'

import { PromoBanner } from './components'

export function HomeV2() {
  const { t } = useTranslation()

  return (
    <PublicLayout showMainContainer={false}>
      {/* Spacer for the fixed nav (h-15 = 60px). */}
      <div aria-hidden className='h-15' />
      {/* Promo banner sits directly below the fixed nav. */}
      <PromoBanner />

      <section className='relative z-10 flex min-h-[calc(100svh-200px)] items-center justify-center overflow-hidden px-6 pt-16 pb-16 md:pt-24 md:pb-24'>
        {/* Radial gradient background (mirrors the current home hero) */}
        <div
          aria-hidden
          className='pointer-events-none absolute inset-0 -z-10 opacity-25 dark:opacity-[0.12]'
          style={{
            background: [
              'radial-gradient(ellipse 60% 50% at 20% 20%, oklch(0.72 0.18 250 / 80%) 0%, transparent 70%)',
              'radial-gradient(ellipse 50% 40% at 80% 15%, oklch(0.65 0.15 200 / 60%) 0%, transparent 70%)',
              'radial-gradient(ellipse 40% 35% at 40% 80%, oklch(0.70 0.12 280 / 40%) 0%, transparent 70%)',
            ].join(', '),
          }}
        />
        {/* Grid pattern */}
        <div
          aria-hidden
          className='absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,black_20%,transparent_100%)] bg-[size:4rem_4rem] opacity-[0.08]'
        />

        <div className='landing-animate-fade-up mx-auto flex max-w-2xl flex-col items-center text-center opacity-0'>
          <div className='mb-5 inline-flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/5 px-3 py-1.5 text-[11px] font-medium text-violet-600 shadow-xs dark:border-violet-400/20 dark:bg-violet-400/5 dark:text-violet-400'>
            <Sparkles className='size-3' />
            <span>{t('Home v2 — Design in Progress')}</span>
          </div>

          <Construction
            className='text-muted-foreground/60 mb-6 size-14'
            strokeWidth={1.25}
          />

          <h1 className='text-2xl leading-tight font-bold tracking-tight md:text-4xl'>
            {t('New homepage redesign sandbox')}
          </h1>
          <p className='text-muted-foreground/80 mx-auto mt-5 max-w-md text-sm leading-relaxed md:text-base'>
            {t(
              'This is an experimental sandbox for the new homepage layout, inspired by openstarry.com. Sections will be added incrementally. The current home page at / remains unchanged.'
            )}
          </p>

          <div className='mt-8 flex flex-wrap items-center justify-center gap-3'>
            <Button
              variant='outline'
              className='group border-border/50 hover:border-border hover:bg-muted/50 h-11 rounded-lg px-5 text-sm font-medium'
              render={<Link to='/' />}
            >
              <ArrowLeft className='mr-1.5 size-4 transition-transform duration-200 group-hover:-translate-x-0.5' />
              <span>{t('Back to current home')}</span>
            </Button>
          </div>

          <p className='text-muted-foreground/40 mt-10 font-mono text-[10px] tracking-[0.2em] uppercase'>
            {t('Sandbox · v0.0.1')}
          </p>
        </div>
      </section>

      <Footer />
    </PublicLayout>
  )
}
