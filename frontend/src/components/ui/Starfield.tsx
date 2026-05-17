import { useEffect, useRef } from 'react'

const CONNECT_DIST = 140

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const motes = Array.from({ length: 88 }, () => ({
      x:       Math.random() * canvas.width,
      y:       Math.random() * canvas.height,
      r:       Math.random() * 2.2 + 0.4,
      opacity: Math.random() * 0.18 + 0.04,
      speed:   Math.random() * 0.5 + 0.1,
    }))

    let t = 0
    let raf: number
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      t += 0.004

      // constellation lines between nearby stars
      for (let i = 0; i < motes.length; i++) {
        for (let j = i + 1; j < motes.length; j++) {
          const a = motes[i], b = motes[j]
          const dx = a.x - b.x, dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECT_DIST) {
            const fade = (1 - dist / CONNECT_DIST)
            const flicker = 0.5 + 0.5 * Math.sin(t * 0.4 + i * 0.7)
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.strokeStyle = `rgba(154, 112, 24, ${fade * 0.07 * flicker})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      // stars on top of lines
      motes.forEach(s => {
        const flicker = s.opacity * (0.5 + 0.5 * Math.sin(t * s.speed + s.x))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(154, 112, 24, ${flicker})`
        ctx.fill()
      })

      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}
    />
  )
}
