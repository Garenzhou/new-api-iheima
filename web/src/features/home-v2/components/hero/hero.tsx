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
import { HeroCtas } from './hero-ctas'
import { HeroEndpoint } from './hero-endpoint'
import { HeroPill } from './hero-pill'
import { HeroTitle } from './hero-title'
import { RoutingDiagram } from './routing-diagram'

export function Hero() {
  return (
    <section className='relative overflow-hidden'>
      {/* Soft cream radial backdrop. Mirrors the reference mood without copying the
          exact brand. `--hero-backdrop` lives in index.css so the gradient is
          reusable and easy to tune. */}
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10'
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 0%, oklch(0.97 0.03 75 / 90%) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 50% 100%, oklch(0.96 0.04 30 / 70%) 0%, transparent 65%)',
        }}
      />

      <div className='mx-auto flex w-full max-w-6xl flex-col items-center gap-7 px-6 pt-14 pb-16 md:gap-8 md:pt-20 md:pb-24 lg:pt-24'>
        <HeroPill className='landing-animate-fade-up opacity-0' />

        <HeroTitle className='landing-animate-fade-up text-center opacity-0 [animation-delay:80ms]' />

        <HeroCtas className='landing-animate-fade-up opacity-0 [animation-delay:160ms]' />

        <HeroEndpoint className='landing-animate-fade-up opacity-0 [animation-delay:240ms]' />

        <div className='landing-animate-fade-up w-full pt-6 opacity-0 [animation-delay:320ms] md:pt-12'>
          <RoutingDiagram />
        </div>
      </div>
    </section>
  )
}
