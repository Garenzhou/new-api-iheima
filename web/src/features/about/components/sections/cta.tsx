import { Link } from '@tanstack/react-router'
import { ArrowRight, Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { AnimateInView } from '@/components/animate-in-view'

export function CTA() {
  return (
    <section className='px-6 py-20 text-center md:py-28'>
      <div className='mx-auto max-w-3xl'>
        <AnimateInView animation='fade-up'>
          <div className='mb-4 font-mono text-[10px] tracking-[0.25em] text-blue-500 uppercase dark:text-blue-400'>
            Get Started
          </div>
          <h2 className='text-foreground text-[clamp(1.75rem,4vw,3rem)] leading-tight font-bold tracking-tight'>
            Start today, 60-second setup
          </h2>
          <p className='text-muted-foreground/60 mt-4 text-sm'>
            No credit card required
          </p>
        </AnimateInView>

        <AnimateInView animation='fade-up' delay={100}>
          <div className='mt-8 flex flex-wrap items-center justify-center gap-3'>
            <Button
              className='group h-11 rounded-lg px-6 text-sm font-medium'
              render={<Link to='/sign-up' />}
            >
              <Zap className='mr-1.5 size-4' />
              Sign up free
              <ArrowRight className='ml-1.5 size-4 transition-transform duration-200 group-hover:translate-x-0.5' />
            </Button>
            <Button
              variant='outline'
              className='border-border/50 hover:border-border hover:bg-muted/50 h-11 rounded-lg px-6 text-sm font-medium'
              render={
                <a
                  href='https://docs.newapi.pro'
                  target='_blank'
                  rel='noopener noreferrer'
                />
              }
            >
              Read the docs
            </Button>
          </div>
        </AnimateInView>
      </div>
    </section>
  )
}
