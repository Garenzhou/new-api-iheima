import { useEffect, useRef } from 'react'

export function ConstellationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (mq.matches) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const MOUSE = { x: -9999, y: -9999 }
    const COUNT = 60
    let W: number
    let H: number
    let pts: Particle[] = []

    class Particle {
      x: number
      y: number
      vx: number
      vy: number
      r: number
      a: number
      twinkle: boolean
      phase: number
      freq: number

      constructor() {
        this.x = Math.random() * W
        this.y = Math.random() * H
        this.vx = (Math.random() - 0.5) * 0.28
        this.vy = (Math.random() - 0.5) * 0.28
        this.r = Math.random() * 1.4 + 0.3
        this.a = Math.random() * 0.7 + 0.15
        this.twinkle = Math.random() < 0.38
        this.phase = Math.random() * Math.PI * 2
        this.freq = 0.3 + Math.random() * 0.9
      }
    }

    function init() {
      W = canvas!.width = canvas!.offsetWidth
      H = canvas!.height = canvas!.offsetHeight
      pts = Array.from({ length: COUNT }, () => new Particle())
    }

    let frame = 0
    let lastTime = 0
    const TARGET_FPS = 30
    const FRAME_INTERVAL = 1000 / TARGET_FPS
    let raf: number

    function draw(timestamp: number) {
      raf = requestAnimationFrame(draw)
      if (timestamp - lastTime < FRAME_INTERVAL) return
      lastTime = timestamp
      frame++
      ctx!.clearRect(0, 0, W, H)

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]

        for (let j = i + 1; j < pts.length; j++) {
          const q = pts[j]
          const dx = p.x - q.x
          const dy = p.y - q.y
          const d = Math.sqrt(dx * dx + dy * dy)
          if (d < 110) {
            ctx!.beginPath()
            ctx!.moveTo(p.x, p.y)
            ctx!.lineTo(q.x, q.y)
            ctx!.strokeStyle = `rgba(128,160,255,${0.14 * (1 - d / 110)})`
            ctx!.lineWidth = 0.55
            ctx!.stroke()
          }
        }

        const mx = p.x - MOUSE.x
        const my = p.y - MOUSE.y
        const md = Math.sqrt(mx * mx + my * my)
        if (md < 160) {
          ctx!.beginPath()
          ctx!.moveTo(p.x, p.y)
          ctx!.lineTo(MOUSE.x, MOUSE.y)
          ctx!.strokeStyle = `rgba(99,140,255,${0.35 * (1 - md / 160)})`
          ctx!.lineWidth = 0.8
          ctx!.stroke()
        }

        const alpha = p.twinkle
          ? p.a * (0.35 + 0.65 * Math.sin(frame * p.freq * 0.038 + p.phase))
          : p.a
        ctx!.beginPath()
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(180,200,255,${alpha})`
        ctx!.fill()

        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > W) p.vx *= -1
        if (p.y < 0 || p.y > H) p.vy *= -1
      }
    }

    function onMouseMove(e: MouseEvent) {
      const r = canvas!.getBoundingClientRect()
      MOUSE.x = e.clientX - r.left
      MOUSE.y = e.clientY - r.top
    }

    window.addEventListener('resize', init, { passive: true })
    document.addEventListener('mousemove', onMouseMove, { passive: true })

    init()
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', init)
      document.removeEventListener('mousemove', onMouseMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className='pointer-events-none absolute inset-0 z-[1] size-full'
    />
  )
}
