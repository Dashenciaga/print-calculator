'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const svgRef = useRef(null)
  const [showLogin, setShowLogin] = useState(false)
  const [loginVisible, setLoginVisible] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
      ['logoWrap','tagline','subtitle','btnGroup','scrollHint'].forEach(id => {
        document.getElementById(id)?.classList.add('show')
      })
    }

    requestAnimationFrame(introAnim)
    return () => { if (floatRaf) cancelAnimationFrame(floatRaf) }
  }, [])

  function openSheet(signup = false) {
    setIsSignUp(signup)
    setError('')
    setShowLogin(true)
    setTimeout(() => setLoginVisible(true), 10)
  }

  function closeSheet() {
    setLoginVisible(false)
    setTimeout(() => setShowLogin(false), 400)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setError('И-мэйлээ шалгаад баталгаажуулаарай!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
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
          margin-bottom: 28px;
          opacity: 0;
          transform: translateY(24px);
          transition: opacity .9s cubic-bezier(0.22,1,0.36,1), transform .9s cubic-bezier(0.22,1,0.36,1);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .logo-wrap.show { opacity: 1; transform: translateY(0); }
        .logo-name { margin-top: 14px; font-size: 24px; font-weight: 700; color: #1a1f36; letter-spacing: -.5px; }
        .tagline {
          font-size: 11px; letter-spacing: .16em; color: #6366f1;
          text-transform: uppercase; font-weight: 600; margin-bottom: 10px;
          opacity: 0; transform: translateY(16px);
          transition: opacity .8s cubic-bezier(0.22,1,0.36,1) .1s, transform .8s cubic-bezier(0.22,1,0.36,1) .1s;
        }
        .tagline.show { opacity: 1; transform: translateY(0); }
        .subtitle {
          font-size: 15px; color: #94a3b8; margin-bottom: 36px;
          max-width: 360px; line-height: 1.7;
          opacity: 0; transform: translateY(16px);
          transition: opacity .8s cubic-bezier(0.22,1,0.36,1) .2s, transform .8s cubic-bezier(0.22,1,0.36,1) .2s;
        }
        .subtitle.show { opacity: 1; transform: translateY(0); }
        .btn-group {
          display: flex; gap: 10px; justify-content: center;
          opacity: 0; transform: translateY(16px);
          transition: opacity .8s cubic-bezier(0.22,1,0.36,1) .3s, transform .8s cubic-bezier(0.22,1,0.36,1) .3s;
        }
        .btn-group.show { opacity: 1; transform: translateY(0); }
        .btn-primary {
          padding: 12px 32px; background: #4f46e5; color: white;
          border: none; border-radius: 10px; font-size: 15px; font-weight: 600;
          cursor: pointer; transition: background .15s, transform .15s;
        }
        .btn-primary:hover { background: #4338ca; transform: scale(1.03); }
        .btn-primary:active { transform: scale(0.97); }
        .btn-secondary {
          padding: 12px 32px; background: white; color: #374151;
          border: 1px solid #e2e8f0; border-radius: 10px; font-size: 15px; font-weight: 500;
          cursor: pointer; transition: background .15s, transform .15s;
        }
        .btn-secondary:hover { background: #f1f5f9; transform: scale(1.03); }
        .scroll-hint {
          position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
          display: flex; flex-direction: column; align-items: center; gap: 5px;
          color: #cbd5e1; font-size: 10px; letter-spacing: .08em;
          opacity: 0; transition: opacity 1s .6s;
        }
        .scroll-hint.show { opacity: 1; }
        .scroll-dot {
          width: 4px; height: 4px; background: #cbd5e1; border-radius: 50%;
          animation: bd 1.6s ease-in-out infinite;
        }
        @keyframes bd { 0%,100%{transform:translateY(0)} 50%{transform:translateY(5px)} }
        .overlay {
          position: fixed; inset: 0; background: rgba(15,15,30,0.5);
          z-index: 50; display: flex; align-items: flex-end; justify-content: center;
          opacity: 0; transition: opacity .35s cubic-bezier(0.22,1,0.36,1);
        }
        .overlay.visible { opacity: 1; }
        .login-sheet {
          width: 100%; max-width: 480px; background: white;
          border-radius: 20px 20px 0 0; padding: 28px 32px 48px;
          transform: translateY(100%);
          transition: transform .45s cubic-bezier(0.22,1,0.36,1);
          position: relative;
        }
        .overlay.visible .login-sheet { transform: translateY(0); }
        .sheet-handle { width: 40px; height: 4px; background: #e2e8f0; border-radius: 2px; margin: 0 auto 24px; }
        .close-btn {
          position: absolute; top: 16px; right: 16px;
          width: 30px; height: 30px; background: #f1f5f9; border: none;
          border-radius: 50%; font-size: 14px; color: #64748b; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
        }
        .sheet-title { font-size: 20px; font-weight: 700; color: #1a1f36; letter-spacing: -.3px; margin-bottom: 4px; text-align: center; }
        .sheet-sub { font-size: 13px; color: #64748b; text-align: center; margin-bottom: 22px; }
        .field-label { display: block; font-size: 12px; font-weight: 500; color: #374151; margin-bottom: 5px; }
        .field-input {
          width: 100%; padding: 10px 13px; font-size: 14px;
          border: 1.5px solid #e2e8f0; border-radius: 10px;
          background: white; color: #1a1f36; outline: none; margin-bottom: 13px;
          transition: border-color .15s;
        }
        .field-input:focus { border-color: #4f46e5; }
        .error-box {
          padding: 10px 13px; border-radius: 9px; font-size: 13px; margin-bottom: 13px;
        }
        .error-box.success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
        .error-box.error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
        .submit-btn {
          width: 100%; padding: 12px; background: #4f46e5; color: white;
          border: none; border-radius: 10px; font-size: 15px; font-weight: 600;
          cursor: pointer; transition: background .15s;
        }
        .submit-btn:hover { background: #4338ca; }
        .submit-btn:disabled { opacity: .6; }
        .switch-row { text-align: center; margin-top: 14px; font-size: 13px; color: #64748b; }
        .switch-link { color: #4f46e5; font-weight: 500; cursor: pointer; background: none; border: none; font-size: 13px; padding: 0; }
      `}</style>

      <main className="landing">
        <div className="logo-wrap" id="logoWrap">
          <svg ref={svgRef} width="72" height="72" viewBox="0 0 75 80" fill="none" />
          <div className="logo-name">PrintCalc Pro</div>
        </div>
        <div className="tagline" id="tagline">Хэвлэлийн тооцоолуур</div>
        <div className="subtitle" id="subtitle">
          Хэвлэлийн материалын байршуулалт, зардал, үнийн санал — бүгдийг нэг дороос
        </div>
        <div className="btn-group" id="btnGroup">
          <button className="btn-primary" onClick={() => openSheet(false)}>Нэвтрэх</button>
          <button className="btn-secondary" onClick={() => openSheet(true)}>Бүртгүүлэх</button>
        </div>
        <div className="scroll-hint" id="scrollHint">
          <span>ДООШ</span>
          <div className="scroll-dot" />
        </div>
      </main>

      {showLogin && (
        <div className={`overlay${loginVisible ? ' visible' : ''}`} onClick={closeSheet}>
          <div className="login-sheet" onClick={e => e.stopPropagation()}>
            <button className="close-btn" onClick={closeSheet}>✕</button>
            <div className="sheet-handle" />
            <div className="sheet-title">{isSignUp ? 'Бүртгүүлэх' : 'Нэвтрэх'}</div>
            <div className="sheet-sub">{isSignUp ? 'Шинэ бүртгэл үүсгэнэ үү' : 'Системд нэвтэрнэ үү'}</div>
            <form onSubmit={handleSubmit}>
              <label className="field-label">И-мэйл хаяг</label>
              <input className="field-input" type="email" placeholder="name@company.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
              <label className="field-label">Нууц үг</label>
              <input className="field-input" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
              {error && (
                <div className={`error-box ${error.includes('шалгаад') ? 'success' : 'error'}`}>{error}</div>
              )}
              <button className="submit-btn" type="submit" disabled={loading}>
                {loading ? 'Түр хүлээнэ үү...' : isSignUp ? 'Бүртгүүлэх' : 'Нэвтрэх'}
              </button>
            </form>
            <div className="switch-row">
              {isSignUp ? 'Бүртгэлтэй юу?' : 'Бүртгэлгүй юу?'}{' '}
              <button className="switch-link" onClick={() => { setIsSignUp(!isSignUp); setError('') }}>
                {isSignUp ? 'Нэвтрэх' : 'Бүртгүүлэх'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}