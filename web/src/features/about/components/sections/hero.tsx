import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { useStatus } from '@/hooks/use-status'

import { ConstellationCanvas } from './constellation-canvas'
import { DataRingCanvas } from './data-ring-canvas'

const TYPewriter_WORDS = [
  'Developers',
  'Indie Hackers',
  'Product Managers',
  'AI Researchers',
  'Entrepreneurs',
  'Everyone',
]

const HERO_GRADIENT = [
  'radial-gradient(ellipse 60% 50% at 20% 20%, oklch(0.72 0.18 250 / 80%) 0%, transparent 70%)',
  'radial-gradient(ellipse 50% 40% at 80% 15%, oklch(0.65 0.15 200 / 60%) 0%, transparent 70%)',
  'radial-gradient(ellipse 40% 35% at 40% 80%, oklch(0.70 0.12 280 / 40%) 0%, transparent 70%)',
].join(', ')

export function Hero() {
  const { status } = useStatus()
  const typewriterRef = useRef<HTMLSpanElement>(null)
  const docsUrl =
    (status?.docs_link as string | undefined) || 'https://docs.newapi.pro'

  useEffect(() => {
    const el = typewriterRef.current
    if (!el) return

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) {
      el.textContent = TYPewriter_WORDS[0]
      return
    }

    let idx = 0
    let timer: ReturnType<typeof setTimeout>
    const TYPE = 85,
      DEL = 48,
      PAUSE = 2000,
      GAP = 300

    function type(word: string, i: number, done: () => void) {
      if (i > word.length) {
        timer = setTimeout(done, PAUSE)
        return
      }
      el!.textContent = word.slice(0, i)
      timer = setTimeout(() => type(word, i + 1, done), TYPE)
    }

    function erase(done: () => void) {
      const s = el!.textContent || ''
      if (!s.length) {
        timer = setTimeout(done, GAP)
        return
      }
      el!.textContent = s.slice(0, -1)
      timer = setTimeout(() => erase(done), DEL)
    }

    function cycle() {
      const word = TYPewriter_WORDS[idx % TYPewriter_WORDS.length]
      type(word, 0, () =>
        erase(() => {
          idx++
          cycle()
        })
      )
    }

    timer = setTimeout(cycle, 1200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section className='relative flex min-h-[100vh] flex-col items-center justify-center overflow-hidden px-6 py-24 md:py-32 lg:py-36'>
      {/* Constellation canvas */}
      <ConstellationCanvas />

      {/* Background gradient */}
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10 opacity-30 dark:opacity-[0.15]'
        style={{ background: HERO_GRADIENT }}
      />
      {/* Grid pattern */}
      <div
        aria-hidden
        className='absolute inset-0 -z-10 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,black_20%,transparent_100%)] bg-[size:4rem_4rem] opacity-[0.08]'
      />

      {/* Data ring canvas */}
      <DataRingCanvas />

      <div className='relative z-[2] mx-auto max-w-4xl text-center'>
        {/* Headline */}
        <h1
          className='landing-animate-fade-up text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.1] font-bold tracking-tight opacity-0'
          style={{ animationDelay: '60ms' }}
        >
          Built for developers who demand the best AI
        </h1>

        {/* Subheadline */}
        <p
          className='landing-animate-fade-up text-muted-foreground/80 mx-auto mt-5 max-w-2xl text-base leading-relaxed opacity-0 md:text-[15px]'
          style={{ animationDelay: '120ms' }}
        >
          Empowering developers with unified access to the world&apos;s leading
          AI models through a single, open API gateway.
        </p>

        {/* Typewriter */}
        <div
          className='landing-animate-fade-up mt-6 opacity-0'
          style={{ animationDelay: '180ms' }}
        >
          <span className='text-muted-foreground/50 text-sm'>Built for </span>
          <span className='text-primary min-w-[120px] font-semibold'>
            <span ref={typewriterRef} />
            <span className='bg-primary ml-0.5 inline-block h-[1.1em] w-[2px] animate-pulse align-text-bottom' />
          </span>
        </div>

        {/* CTA buttons */}
        <div
          className='landing-animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-3 opacity-0'
          style={{ animationDelay: '240ms' }}
        >
          <Button
            className='group h-11 rounded-lg px-5 text-sm font-medium'
            render={<Link to='/sign-up' />}
          >
            Get Started
            <ArrowRight className='ml-1.5 size-4 transition-transform duration-200 group-hover:translate-x-0.5' />
          </Button>
          <Button
            variant='outline'
            className='border-border/50 hover:border-border hover:bg-muted/50 h-11 rounded-lg px-5 text-sm font-medium'
            render={
              <a href={docsUrl} target='_blank' rel='noopener noreferrer' />
            }
          >
            Read the docs
          </Button>
        </div>
      </div>
    </section>
  )
}
