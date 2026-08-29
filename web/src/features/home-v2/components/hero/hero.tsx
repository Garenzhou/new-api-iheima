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
      {/* Three-layer backdrop, inspired by the reference site's
       * linear-gradient(150deg, #fff6ee, #ffeede) cream stage with a
       * faint indigo overlay so the project palette still comes through.
       * Pure-CSS, no images. */}
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10'
        style={{
          background:
            'linear-gradient(150deg, #fff6ee 0%, #ffeede 100%)',
        }}
      />
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10 opacity-100'
        style={{
          background:
            'radial-gradient(ellipse 65% 45% at 50% 8%, rgba(255, 246, 238, 1) 0%, transparent 60%), radial-gradient(ellipse 55% 40% at 50% 100%, rgba(255, 222, 190, 0.55) 0%, transparent 65%)',
        }}
      />
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10 opacity-30'
        style={{
          background:
            'radial-gradient(ellipse 65% 50% at 50% 35%, rgba(143, 167, 255, 0.22) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className='pointer-events-none absolute inset-0 -z-10 opacity-[0.05]'
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(20, 17, 15, 0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(20, 17, 15, 0.5) 1px, transparent 1px)',
          backgroundSize: '4rem 4rem',
          maskImage:
            'radial-gradient(ellipse 60% 50% at 50% 30%, black 20%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 60% 50% at 50% 30%, black 20%, transparent 100%)',
        }}
      />

      <div className='mx-auto flex w-full max-w-6xl flex-col items-center gap-7 px-6 pt-14 pb-16 md:gap-8 md:pt-20 md:pb-24 lg:pt-24'>
        <HeroPill />

        <HeroTitle className='text-center' />

        <HeroCtas />

        <HeroEndpoint />

        <div
          className='tr-hero-part w-full pt-6 md:pt-12'
          style={{ ['--hero-delay' as string]: '600ms' }}
        >
          <RoutingDiagram />
        </div>
      </div>
    </section>
  )
}
