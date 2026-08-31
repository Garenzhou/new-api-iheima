import { useEffect, useRef } from 'react'

export function DataRingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const reduce = mq.matches

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let W = 0
    let H = 0
    let cx = 0
    let cy = 0

    function resize() {
      W = canvas!.clientWidth
      H = canvas!.clientHeight
      canvas!.width = W * dpr
      canvas!.height = H * dpr
      cx = W / 2
      cy = H / 2
      ctx!.setTransform(1, 0, 0, 1, 0, 0)
      ctx!.scale(dpr, dpr)
    }

    resize()
    window.addEventListener('resize', resize, { passive: true })

    const GOLD = '128,160,255'
    const TEAL = '90,170,160'
    const planets = Array.from({ length: 6 }, (_, i) => ({
      angle: (Math.PI * 2 / 6) * i,
      radius: 0.32 + (i % 3) * 0.18,
      speed: 0.14 + (i % 4) * 0.06,
      size: 2 + (i % 3) * 1.2,
    }))

    let raf: number

    function frame(t: number) {
      raf = requestAnimationFrame(frame)
      t = t * 0.001
      if (W === 0) return
      ctx!.clearRect(0, 0, W, H)
      const r = Math.min(W, H) * 0.46

      // Concentric rings
      ;[0.3, 0.55, 0.8, 1.0].forEach((scale, i) => {
        ctx!.beginPath()
        ctx!.arc(cx, cy, r * scale, 0, Math.PI * 2)
        ctx!.strokeStyle = `rgba(${GOLD},${0.12 + i * 0.05})`
        ctx!.lineWidth = 0.5
        ctx!.stroke()
      })

      // Outer ring tick marks
      for (let i = 0; i < 60; i++) {
        const a = (Math.PI * 2 / 60) * i
        ctx!.strokeStyle = `rgba(${GOLD},0.3)`
        ctx!.lineWidth = i % 5 === 0 ? 1 : 0.4
        ctx!.beginPath()
        ctx!.moveTo(cx + Math.cos(a) * r * 0.98, cy + Math.sin(a) * r * 0.98)
        ctx!.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
        ctx!.stroke()
      }

      // Center cross
      ctx!.strokeStyle = 'rgba(180,200,255,0.15)'
      ctx!.lineWidth = 0.5
      ctx!.beginPath()
      ctx!.moveTo(cx - r * 0.06, cy)
      ctx!.lineTo(cx + r * 0.06, cy)
      ctx!.stroke()
      ctx!.beginPath()
      ctx!.moveTo(cx, cy - r * 0.06)
      ctx!.lineTo(cx, cy + r * 0.06)
      ctx!.stroke()

      if (!reduce) {
        planets.forEach((p, idx) => {
          const a = p.angle + t * p.speed
          const pr = r * p.radius
          const x = cx + Math.cos(a) * pr
          const y = cy + Math.sin(a) * pr

          // Trail arc
          ctx!.beginPath()
          ctx!.arc(cx, cy, pr, a - 0.5, a)
          ctx!.strokeStyle = `rgba(${GOLD},${0.15 + idx * 0.02})`
          ctx!.lineWidth = 0.6
          ctx!.stroke()

          // Planet glow
          const col = idx % 3 === 0 ? TEAL : GOLD
          const g = ctx!.createRadialGradient(x, y, 0, x, y, p.size * 4)
          g.addColorStop(0, `rgba(${col},0.8)`)
          g.addColorStop(1, `rgba(${col},0)`)
          ctx!.fillStyle = g
          ctx!.beginPath()
          ctx!.arc(x, y, p.size * 4, 0, Math.PI * 2)
          ctx!.fill()

          // Planet dot
          ctx!.fillStyle = `rgba(${col},1)`
          ctx!.beginPath()
          ctx!.arc(x, y, p.size, 0, Math.PI * 2)
          ctx!.fill()
        })

        // Center glow
        const cg = ctx!.createRadialGradient(cx, cy, 0, cx, cy, 20)
        cg.addColorStop(0, `rgba(${GOLD},0.8)`)
        cg.addColorStop(1, `rgba(${GOLD},0)`)
        ctx!.fillStyle = cg
        ctx!.beginPath()
        ctx!.arc(cx, cy, 20, 0, Math.PI * 2)
        ctx!.fill()

        // Center dot
        ctx!.fillStyle = '#b4c8ff'
        ctx!.beginPath()
        ctx!.arc(cx, cy, 3, 0, Math.PI * 2)
        ctx!.fill()
      }
    }

    raf = requestAnimationFrame(frame)

    function onVisibilityChange() {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        raf = 0
      } else if (!raf) {
        raf = requestAnimationFrame(frame)
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className='pointer-events-none absolute top-1/2 right-[5%] z-[1] hidden -translate-y-1/2 size-[clamp(240px,30vw,460px)] opacity-60 max-lg:right-[-6%] max-lg:opacity-45 max-md:hidden'
    />
  )
}
