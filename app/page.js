'use client'
import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const svgRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    const barDefs = [
      {x:8,  baseY:4,  h:46, op:.85, color:'#4f46e5'},
      {x:8,  baseY:58, h:10, op:.35, color:'#4f46e5'},
      {x:21, baseY:4,  h:22, op:.6,  color:'#4f46e5'},
      {x:21, baseY:34, h:42, op:.85, color:'#4f46e5'},
      {x:34, baseY:4,  h:58, op:.9,  color:'#818cf8'},
      {x:34, baseY:70, h:6,  op:.3,  color:'#818cf8'},
      {x:47, baseY:14, h:10, op:.4,  color:'#4f46e5'},
      {x:47, baseY:32, h:34, op:.75, color:'#4f46e5'},
      {x:60, baseY:4,  h:50, op:.55, color:'#4f46e5'},
      {x:60, baseY:62, h:14, op:.3,  color:'#4f46e5'},
    ]

    const ns = 'http://www.w3.org/2000/svg'
    const rects = barDefs.map((b, i) => {
      const r = document.createElementNS(ns, 'rect')
      r.setAttribute('width', 7)
      r.setAttribute('rx', '3.5')
      r.setAttribute('fill', b.color)
      r.setAttribute('opacity', b.op)
      r.setAttribute('x', b.x)
      r.setAttribute('y', b.baseY + b.h)
      r.setAttribute('height', 0)
      svg.appendChild(r)
      return { el: r, ...b, delay: i * 55 }
    })

    let startTime = null
    let floatRaf = null

    function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3) }

    function introAnim(ts) {
      if (!startTime) startTime = ts
      const elapsed = ts - startTime
      let allDone = true
      rects.forEach(r => {
        const t = Math.max(0, Math.min(1, (elapsed - r.delay) / 650))
        const e = easeOutCubic(t)
        r.el.setAttribute('y', r.baseY + r.h * (1 - e))
        r.el.setAttribute('height', r.h * e)
        if (t < 1) allDone = false
      })
      if (!allDone) {
        requestAnimationFrame(introAnim)
      } else {
        rects.forEach(r => {
          r.el.setAttribute('y', r.baseY)
          r.el.setAttribute('height', r.h)
        })
        startFloat()
        showContent()
      }
    }

    function startFloat() {
      let t = 0
      const phases = rects.map((_, i) => i * 0.45)
      function loop() {
        t += 0.018
        rects.forEach((r, i) => {
          r.el.setAttribute('y', r.baseY + Math.sin(t + phases[i]) * 2.5)
        })
        floatRaf = requestAnimationFrame(loop)
      }
      floatRaf = requestAnimationFrame(loop)
    }

    function showContent() {
      ['logoWrap', 'tagline', 'subtitle', 'btnGroup', 'scrollHint'].forEach(id => {
        document.getElementById(id)?.classList.add('show')
      })
    }

    requestAnimationFrame(introAnim)
    return () => { if (floatRaf) cancelAnimationFrame(floatRaf) }
  }, [])

  return (
    <>
      <style>{`
        .landing {
          min-height: 100vh;
          background: #f8f9fb;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .logo-wrap {
          margin-bottom: 32px;
          opacity: 0;
          transform: translateY(24px);
          transition: opacity .9s cubic-bezier(0.22,1,0.36,1), transform .9s cubic-bezier(0.22,1,0.36,1);
        }
        .logo-wrap.show { opacity: 1; transform: translateY(0); }
        .logo-name {
          margin-top: 14px;
          font-size: 24px;
          font-weight: 700;
          color: #1a1f36;
          letter-spacing: -.5px;
        }
        .tagline {
          font-size: 11px;
          letter-spacing: .16em;
          color: #6366f1;
          text-transform: uppercase;
          font-weight: 600;
          margin-bottom: 10px;
          opacity: 0;
          transform: translateY(16px);
          transition: opacity .8s cubic-bezier(0.22,1,0.36,1) .1s, transform .8s cubic-bezier(0.22,1,0.36,1) .1s;
        }
        .tagline.show { opacity: 1; transform: translateY(0); }
        .subtitle {
          font-size: 15px;
          color: #94a3b8;
          margin-bottom: 36px;
          max-width: 360px;
          line-height: 1.7;
          opacity: 0;
          transform: translateY(16px);
          transition: opacity .8s cubic-bezier(0.22,1,0.36,1) .2s, transform .8s cubic-bezier(0.22,1,0.36,1) .2s;
        }
        .subtitle.show { opacity: 1; transform: translateY(0); }
        .btn-group {
          display: flex;
          gap: 10px;
          justify-content: center;
          opacity: 0;
          transform: translateY(16px);
          transition: opacity .8s cubic-bezier(0.22,1,0.36,1) .3s, transform .8s cubic-bezier(0.22,1,0.36,1) .3s;
        }
        .btn-group.show { opacity: 1; transform: translateY(0); }
        .btn-primary {
          padding: 12px 30px;
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background .15s, transform .1s;
        }
        .btn-primary:hover { background: #4338ca; transform: scale(1.02); }
        .btn-primary:active { transform: scale(0.98); }
        .btn-secondary {
          padding: 12px 30px;
          background: white;
          color: #374151;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: background .15s, transform .1s;
        }
        .btn-secondary:hover { background: #f1f5f9; transform: scale(1.02); }
        .scroll-hint {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          color: #cbd5e1;
          font-size: 10px;
          letter-spacing: .08em;
          opacity: 0;
          transition: opacity 1s .6s;
        }
        .scroll-hint.show { opacity: 1; }
        .scroll-dot {
          width: 4px;
          height: 4px;
          background: #cbd5e1;
          border-radius: 50%;
          animation: bd 1.6s ease-in-out infinite;
        }
        @keyframes bd {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(5px); }
        }
      `}</style>

      <main className="landing">
        <div className="logo-wrap" id="logoWrap">
          <svg ref={svgRef} width="72" height="72" viewBox="0 0 80 80" fill="none" />
          <div className="logo-name">PrintCalc Pro</div>
        </div>
        <div className="tagline" id="tagline">Хэвлэлийн тооцоолуур</div>
        <div className="subtitle" id="subtitle">
          Хэвлэлийн материалын байршуулалт, зардал, үнийн санал — бүгдийг нэг дороос
        </div>
        <div className="btn-group" id="btnGroup">
          <button className="btn-primary" onClick={() => router.push('/login')}>Нэвтрэх</button>
          <button className="btn-secondary" onClick={() => router.push('/login')}>Бүртгүүлэх</button>
        </div>
        <div className="scroll-hint" id="scrollHint">
          <span>ДООШ</span>
          <div className="scroll-dot" />
        </div>
      </main>
    </>
  )
}