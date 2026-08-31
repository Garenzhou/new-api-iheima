import { Mail, MessageSquare } from 'lucide-react'

import { AnimateInView } from '@/components/animate-in-view'

const CHANNELS = [
  {
    icon: Mail,
    label: 'Technical Support',
    title: 'Integration · Billing · Incidents',
    desc: '4h response on weekdays · P0 incidents <15 min',
    link: 'mailto:support@atoken.tech',
    linkText: 'support@atoken.tech',
  },
  {
    icon: MessageSquare,
    label: 'Product Feedback',
    title: 'Ideas · Votes · Bugs',
    desc: 'Every message answered · Roadmap shaped by users',
    link: 'mailto:support@atoken.tech',
    linkText: 'support@atoken.tech',
  },
]

export function Contact() {
  return (
    <section className='bg-muted/20 px-6 py-20 md:py-28'>
      <div className='mx-auto max-w-6xl'>
        <AnimateInView animation='fade-up'>
          <div className='mb-2 font-mono text-[10px] tracking-[0.25em] text-blue-500 uppercase dark:text-blue-400'>
            Get in Touch
          </div>
          <h2 className='text-foreground text-[clamp(1.75rem,3.5vw,2.75rem)] leading-tight font-bold tracking-tight'>
            Every message answered,{' '}
            <span className='italic text-amber-500 dark:text-amber-400'>
              no barriers
            </span>
          </h2>
        </AnimateInView>

        <div className='mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border/50 bg-border/50 sm:grid-cols-2'>
          {CHANNELS.map((channel, i) => (
            <AnimateInView
              key={channel.label}
              animation='fade-up'
              delay={80 + i * 80}
            >
              <div className='bg-background group flex h-full flex-col p-6 transition-colors duration-300 hover:bg-muted/30 md:p-8'>
                <span className='text-muted-foreground/40 mb-2 font-mono text-[9px] tracking-[0.2em] uppercase'>
                  {channel.label}
                </span>
                <h3 className='text-foreground mb-1 text-base font-bold tracking-tight'>
                  {channel.title}
                </h3>
                <p className='text-muted-foreground/60 mb-4 text-sm leading-relaxed'>
                  {channel.desc}
                </p>
                <a
                  href={channel.link}
                  className='text-primary mt-auto inline-flex items-center gap-1 font-mono text-xs transition-colors hover:underline'
                >
                  {channel.linkText}
                </a>
              </div>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}
