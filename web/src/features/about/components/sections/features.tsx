import { Code, Zap, Users } from 'lucide-react'

import { AnimateInView } from '@/components/animate-in-view'

const FEATURES = [
  {
    icon: Code,
    title: 'Engineering Depth',
    desc: 'Core team with deep expertise in high-concurrency distributed systems and AI inference pipelines — we know exactly what breaks in production.',
    tags: ['Go / Rust', 'Distributed', 'AI Inference'],
    color: 'text-orange-500 dark:text-orange-400',
    bg: 'bg-orange-500/10 dark:bg-orange-400/10',
  },
  {
    icon: Zap,
    title: 'We Ship What We Promise',
    desc: 'New models live within 72h of release. Feedback-to-feature cycles measured in days, not quarters. In the AI era, speed is itself a product capability.',
    tags: ['72h to ship', 'Fast iteration', 'Feedback loop'],
    color: 'text-amber-500 dark:text-amber-400',
    bg: 'bg-amber-500/10 dark:bg-amber-400/10',
  },
  {
    icon: Users,
    title: 'We Are the Users We Build For',
    desc: 'Every team member is a heavy AI tools user. We\'ve hit every wall you\'ve hit — rate limits, outages, confusing bills, code rewrites when switching models.',
    tags: ['DX-First', 'Co-creation', 'Open roadmap'],
    color: 'text-muted-foreground',
    bg: 'bg-muted/50',
  },
]

export function Features() {
  return (
    <section className='bg-muted/20 px-6 py-20 md:py-28'>
      <div className='mx-auto max-w-6xl'>
        <AnimateInView animation='fade-up'>
          <div className='mb-2 font-mono text-[10px] tracking-[0.25em] text-blue-500 uppercase dark:text-blue-400'>
            Team strength
          </div>
          <h2 className='text-foreground text-[clamp(1.75rem,3.5vw,2.75rem)] leading-tight font-bold tracking-tight'>
            Do the hard right thing,{' '}
            <span className='italic text-amber-500 dark:text-amber-400'>
              never the shortcut
            </span>
          </h2>
        </AnimateInView>

        <div className='mt-12 space-y-0 border-t border-border/50'>
          {FEATURES.map((feature, i) => (
            <AnimateInView
              key={feature.title}
              animation='fade-up'
              delay={80 + i * 80}
            >
              <div className='group flex flex-col gap-4 border-b border-border/50 py-8 transition-all duration-300 hover:px-3 md:flex-row md:items-start md:gap-8'>
                <span className='text-muted-foreground/30 font-mono text-[10px] tracking-widest'>
                  0{i + 1}
                </span>
                <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${feature.bg}`}>
                  <feature.icon className={`size-5 ${feature.color}`} />
                </div>
                <div className='flex-1'>
                  <h3 className='text-foreground mb-2 text-lg font-bold tracking-tight'>
                    {feature.title}
                  </h3>
                  <p className='text-muted-foreground/60 text-sm leading-relaxed'>
                    {feature.desc}
                  </p>
                </div>
                <div className='flex shrink-0 flex-wrap gap-1.5 md:flex-col md:items-end'>
                  {feature.tags.map((tag) => (
                    <span
                      key={tag}
                      className='border-border/50 bg-muted/30 text-muted-foreground/60 inline-block rounded-full border px-2.5 py-1 font-mono text-[10px]'
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}
