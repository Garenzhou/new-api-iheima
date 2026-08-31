import { AnimateInView } from '@/components/animate-in-view'

const VALUES = [
  {
    title: 'Access',
    desc: 'AI shouldn\'t be a privilege for the few. Geographic borders, payment barriers, language gaps — these are the walls we tear down.',
    accent: true,
  },
  {
    title: 'Excellence',
    desc: 'No compromise on engineering quality. Every millisecond of latency, every call\'s reliability — they all deserve serious attention.',
    accent: false,
  },
  {
    title: 'Transparency',
    desc: 'Bills are auditable, the roadmap is public, changelogs don\'t sugarcoat failures. Trust must be earned, not demanded.',
    accent: false,
  },
  {
    title: 'Long-term',
    desc: 'We build for the next decade, not the next quarter. Short-term growth isn\'t worth trading user trust.',
    accent: true,
  },
]

export function Values() {
  return (
    <section className='px-6 py-20 md:py-28'>
      <div className='mx-auto max-w-6xl'>
        <AnimateInView animation='fade-up'>
          <div className='mb-2 font-mono text-[10px] tracking-[0.25em] text-blue-500 uppercase dark:text-blue-400'>
            Our values
          </div>
          <h2 className='text-foreground text-[clamp(1.75rem,3.5vw,2.75rem)] leading-tight font-bold tracking-tight'>
            What we stand for,{' '}
            <span className='italic text-amber-500 dark:text-amber-400'>
              without compromise
            </span>
          </h2>
        </AnimateInView>

        <div className='mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border/50 bg-border/50 sm:grid-cols-2'>
          {VALUES.map((value, i) => (
            <AnimateInView
              key={value.title}
              animation='fade-up'
              delay={80 + i * 80}
            >
              <div className='bg-background group flex h-full flex-col p-8 transition-colors duration-300 hover:bg-muted/50'>
                <span className='text-muted-foreground/40 mb-4 font-mono text-[10px] tracking-[0.25em]'>
                  0{i + 1}
                </span>
                <h3
                  className={`mb-1 text-[clamp(2rem,4vw,3rem)] leading-none font-bold tracking-tight ${
                    value.accent
                      ? 'text-amber-500 group-hover:text-amber-600 dark:text-amber-400 dark:group-hover:text-amber-300'
                      : 'text-foreground'
                  }`}
                >
                  {value.title}
                </h3>
                <span className='text-muted-foreground/50 mb-4 font-mono text-[10.5px] tracking-[0.2em] uppercase'>
                  {value.title}
                </span>
                <p className='text-muted-foreground/60 mt-auto text-sm leading-relaxed'>
                  {value.desc}
                </p>
              </div>
            </AnimateInView>
          ))}
        </div>
      </div>
    </section>
  )
}
