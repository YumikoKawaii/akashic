import { useEffect, useRef } from 'react'

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

    const motes = Array.from({ length: 80 }, () => ({
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
