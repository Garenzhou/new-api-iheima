import { AnimateInView } from '@/components/animate-in-view'

const BELIEFS = [
  {
    key: 'AI power should be universal, not privileged',
    desc: 'An indie developer deserves the same efficiency as anyone else when accessing top AI models. We curate the best models, unify the interface, and lower the barrier to entry.',
  },
  {
    key: 'Transparency is the foundation of trust',
    desc: 'Zero markup on Token Plan means exactly zero. Every invoice shows the raw FX rate — you can audit, challenge, and leave anytime. We don\'t profit from hidden fees.',
  },
  {
    key: 'Infrastructure should be invisible',
    desc: 'Your energy belongs in your product — not in fighting rate limits, outages, and FX math. We handle all the complexity so you only need one line of code.',
  },
]

export function Vision() {
  return (
    <section className='bg-muted/30 px-6 py-20 md:py-28'>
      <div className='mx-auto max-w-4xl text-center'>
        <AnimateInView animation='fade-up'>
          <p className='text-foreground/90 mx-auto max-w-2xl text-[clamp(1.5rem,3vw,2.5rem)] leading-snug font-semibold tracking-tight italic'>
            &ldquo;The best AI should be within everyone&apos;s reach.&rdquo;
          </p>
        </AnimateInView>

        <AnimateInView animation='fade-up' delay={100}>
          <p className='text-muted-foreground/70 mx-auto mt-6 max-w-xl text-sm leading-relaxed'>
            We started this project because we experienced the friction
            ourselves — juggling multiple API keys, inconsistent rate limits,
            and opaque pricing. We built the gateway we wished existed.
          </p>
        </AnimateInView>

        <div className='mt-12 space-y-0 border-t-2 border-border/50'>
          {BELIEFS.map((belief, i) => (
            <AnimateInView
              key={belief.key}
              animation='fade-up'
              delay={150 + i * 80}
            >
              <div className='group flex items-start gap-8 border-b border-border/50 py-8 text-left transition-all duration-300 hover:px-3'>
                <span className='text-muted-foreground/40 font-mono text-xs tracking-widest'>
                  0{i + 1}
                </span>
                <div>
                  <h3 className='text-foreground mb-2 text-lg font-bold tracking-tight'>
                    {belief.key}
                  </h3>
                  <p className='text-muted-foreground/70 text-sm leading-relaxed'>
                    {belief.desc}
                  </p>
                </div>
              </div>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}
