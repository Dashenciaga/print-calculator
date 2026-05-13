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
  const [navScrolled, setNavScrolled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function checkUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('company_name')
          .eq('user_id', user.id)
          .single()
        if (prof?.company_name) {
          router.push('/dashboard')
        } else {
          router.push('/profile')
        }
      }
    }
    checkUser()
  }, [])

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
    requestAnimationFrame(introAnim)
    return () => { if (floatRaf) cancelAnimationFrame(floatRaf) }
  }, [])

  useEffect(() => {
    function onScroll() {
      setNavScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
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

  const features = [
    {
      icon: (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#4f46e5" strokeWidth="2">
          <rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 7h8M8 12h5"/>
        </svg>
      ),
      title: 'Хуудасны байршуулалт',
      desc: 'Нэг хэвлэлийн хуудсанд хэдэн ширхэг материал багтахыг автоматаар тооцоолно.',
    },
    {
      icon: (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#4f46e5" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      ),
      title: 'Нарийн зардлын тооцоо',
      desc: 'Хуудасны үнэ, ажиллагааны зардал, НӨАТ, нэмэгдэлийг тусгасан дэлгэрэнгүй тооцоо.',
    },
    {
      icon: (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#4f46e5" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
      ),
      title: 'Үнийн санал үүсгэх',
      desc: 'Тооцоогоо PDF үнийн санал болгон хэдхэн секундэд бэлдэж харилцагчдад илгээнэ.',
    },
    {
      icon: (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#4f46e5" strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      ),
      title: 'Тооцооны түүх',
      desc: 'Өмнөх бүх тооцоогоо хадгалж, дахин ашиглах эсвэл харьцуулалт хийх боломжтой.',
    },
    {
      icon: (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#4f46e5" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      title: 'Хурдан & Хялбар',
      desc: 'Цаасны хэмжээ, материалын хэмжээ оруулахад л тооцоо бэлэн болно. Хэдхэн секунд.',
    },
    {
      icon: (
        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#4f46e5" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      title: 'Компанийн профайл',
      desc: 'Өөрийн компанийн лого, нэр, холбоо барих мэдээллийг тохируулж брендтэй ажиллана.',
    },
  ]

  const plans = [
    {
      name: 'Энгийн',
      price: 'Үнэгүй',
      sub: 'Бүртгүүлэхэд л хангалттай',
      color: '#64748b',
      bg: 'white',
      border: '#e2e8f0',
      btnStyle: { background: 'white', color: '#4f46e5', border: '1.5px solid #4f46e5' },
      features: [
        { text: 'Хуудасны байршуулалт тооцоо', ok: true },
        { text: 'Нэгж өртөг тооцоо', ok: true },
        { text: 'Үр ашгийн хувь', ok: true },
        { text: 'Компанийн профайл', ok: true },
        { text: 'Тооцооны түүх хадгалах', ok: false },
        { text: 'Нарийн зардлын задаргаа', ok: false },
        { text: 'PDF үнийн санал үүсгэх', ok: false },
        { text: 'Тооцоо татаж авах', ok: false },
        { text: 'Хязгааргүй хадгалалт', ok: false },
      ],
      cta: 'Үнэгүй эхлэх',
      ctaAction: () => openSheet(true),
    },
    {
      name: 'Жилийн эрхт',
      price: '₮199,000',
      sub: '/ жил · НӨАТ орсон',
      color: '#4f46e5',
      bg: '#faf5ff',
      border: '#a5b4fc',
      badge: 'Санал болгох',
      btnStyle: { background: '#4f46e5', color: 'white', border: 'none' },
      features: [
        { text: 'Хуудасны байршуулалт тооцоо', ok: true },
        { text: 'Нэгж өртөг тооцоо', ok: true },
        { text: 'Үр ашгийн хувь', ok: true },
        { text: 'Компанийн профайл', ok: true },
        { text: 'Тооцооны түүх хадгалах', ok: true },
        { text: 'Нарийн зардлын задаргаа', ok: true },
        { text: 'PDF үнийн санал үүсгэх', ok: true },
        { text: 'Тооцоо татаж авах', ok: true },
        { text: 'Хязгааргүй хадгалалт', ok: true },
      ],
      cta: 'Жилийн эрх авах',
      ctaAction: () => openSheet(true),
    },
  ]

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { background: #f8f9fb; font-family: system-ui,-apple-system,sans-serif; }

        /* NAV */
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          height: 60px; display: flex; align-items: center; justify-content: space-between;
          padding: 0 32px;
          transition: background .25s, box-shadow .25s;
        }
        .nav.scrolled { background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); box-shadow: 0 1px 0 #e2e8f0; }
        .nav-logo { display: flex; align-items: center; gap: 8px; text-decoration: none; }
        .nav-logo-icon { width: 30px; height: 30px; background: #4f46e5; border-radius: 7px; display: flex; align-items: center; justify-content: center; }
        .nav-logo-name { font-size: 15px; font-weight: 700; color: #1a1f36; letter-spacing: -.3px; }
        .nav-btns { display: flex; gap: 8px; align-items: center; }
        .nav-login { padding: 8px 18px; background: transparent; border: 1.5px solid #e2e8f0; border-radius: 8px; font-size: 13px; font-weight: 500; color: #374151; cursor: pointer; transition: all .15s; }
        .nav-login:hover { border-color: #4f46e5; color: #4f46e5; }
        .nav-register { padding: 8px 18px; background: #4f46e5; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; color: white; cursor: pointer; transition: background .15s, transform .15s; }
        .nav-register:hover { background: #4338ca; transform: scale(1.03); }

        /* HERO */
        .hero {
          min-height: 100vh; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 100px 24px 80px; text-align: center;
          background: linear-gradient(160deg, #f0f0ff 0%, #f8f9fb 60%);
          position: relative; overflow: hidden;
        }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 6px;
          background: #ede9fe; color: #5b21b6; font-size: 11px; font-weight: 600;
          letter-spacing: .1em; text-transform: uppercase;
          padding: 5px 12px; border-radius: 20px; margin-bottom: 24px;
          animation: fadeUp .8s cubic-bezier(0.22,1,0.36,1) both;
        }
        .hero-title {
          font-size: clamp(32px, 6vw, 56px); font-weight: 800;
          color: #1a1f36; letter-spacing: -1.5px; line-height: 1.1;
          max-width: 700px; margin-bottom: 20px;
          animation: fadeUp .8s cubic-bezier(0.22,1,0.36,1) .1s both;
        }
        .hero-title span { color: #4f46e5; }
        .hero-sub {
          font-size: 17px; color: #64748b; line-height: 1.7;
          max-width: 480px; margin-bottom: 36px;
          animation: fadeUp .8s cubic-bezier(0.22,1,0.36,1) .2s both;
        }
        .hero-btns {
          display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;
          animation: fadeUp .8s cubic-bezier(0.22,1,0.36,1) .3s both;
        }
        .btn-primary {
          padding: 14px 36px; background: #4f46e5; color: white;
          border: none; border-radius: 10px; font-size: 15px; font-weight: 600;
          cursor: pointer; transition: background .15s, transform .15s;
        }
        .btn-primary:hover { background: #4338ca; transform: scale(1.03); }
        .btn-secondary {
          padding: 14px 36px; background: white; color: #374151;
          border: 1.5px solid #e2e8f0; border-radius: 10px; font-size: 15px; font-weight: 500;
          cursor: pointer; transition: all .15s;
        }
        .btn-secondary:hover { border-color: #4f46e5; color: #4f46e5; transform: scale(1.03); }
        .hero-logo-wrap {
          margin-bottom: 32px;
          animation: fadeUp .6s cubic-bezier(0.22,1,0.36,1) both;
        }
        .hero-stats {
          display: flex; gap: 32px; justify-content: center; margin-top: 56px;
          animation: fadeUp .8s cubic-bezier(0.22,1,0.36,1) .4s both;
          flex-wrap: wrap;
        }
        .stat-item { text-align: center; }
        .stat-val { font-size: 26px; font-weight: 800; color: #1a1f36; letter-spacing: -1px; }
        .stat-lbl { font-size: 12px; color: #94a3b8; margin-top: 2px; }

        /* FEATURES */
        .section { padding: 80px 24px; }
        .section-inner { max-width: 1000px; margin: 0 auto; }
        .section-badge {
          display: inline-block; background: #ede9fe; color: #5b21b6;
          font-size: 11px; font-weight: 600; letter-spacing: .1em;
          text-transform: uppercase; padding: 4px 12px; border-radius: 20px; margin-bottom: 14px;
        }
        .section-title {
          font-size: clamp(24px, 4vw, 36px); font-weight: 800;
          color: #1a1f36; letter-spacing: -1px; margin-bottom: 10px;
        }
        .section-sub { font-size: 15px; color: #64748b; max-width: 480px; line-height: 1.7; margin-bottom: 48px; }
        .features-grid {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
        }
        .feature-card {
          background: white; border: 1px solid #e2e8f0; border-radius: 12px;
          padding: 22px; transition: box-shadow .2s, transform .2s;
        }
        .feature-card:hover { box-shadow: 0 8px 24px rgba(79,70,229,.08); transform: translateY(-2px); }
        .feature-icon {
          width: 42px; height: 42px; background: #eef2ff; border-radius: 10px;
          display: flex; align-items: center; justify-content: center; margin-bottom: 14px;
        }
        .feature-title { font-size: 14px; font-weight: 700; color: #1a1f36; margin-bottom: 6px; }
        .feature-desc { font-size: 13px; color: #64748b; line-height: 1.6; }

        /* PRICING */
        .pricing-section { padding: 80px 24px; background: #f4f5f7; }
        .pricing-inner { max-width: 760px; margin: 0 auto; }
        .plans-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 600px) { .plans-grid { grid-template-columns: 1fr; } }
        .plan-card {
          border-radius: 14px; padding: 28px 24px;
          transition: box-shadow .2s;
          position: relative;
        }
        .plan-card:hover { box-shadow: 0 12px 32px rgba(79,70,229,.12); }
        .plan-badge {
          position: absolute; top: -10px; left: 50%; transform: translateX(-50%);
          background: #4f46e5; color: white; font-size: 10px; font-weight: 700;
          letter-spacing: .08em; text-transform: uppercase;
          padding: 3px 12px; border-radius: 20px; white-space: nowrap;
        }
        .plan-name { font-size: 18px; font-weight: 800; margin-bottom: 4px; }
        .plan-price { font-size: 28px; font-weight: 800; letter-spacing: -1px; margin: 12px 0 4px; }
        .plan-sub { font-size: 12px; color: #94a3b8; margin-bottom: 20px; }
        .plan-divider { height: 1px; background: #e2e8f0; margin: 16px 0; }
        .plan-feat { display: flex; align-items: center; gap: 9px; padding: 5px 0; font-size: 13px; }
        .plan-feat-ok { color: #1a1f36; }
        .plan-feat-no { color: #cbd5e1; }
        .check-icon { flex-shrink: 0; }
        .plan-btn {
          width: 100%; padding: 12px; border-radius: 9px; font-size: 14px;
          font-weight: 600; cursor: pointer; margin-top: 20px;
          transition: opacity .15s, transform .15s;
        }
        .plan-btn:hover { opacity: .88; transform: scale(1.02); }

        /* CTA SECTION */
        .cta-section {
          padding: 80px 24px;
          background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
          text-align: center;
        }
        .cta-title { font-size: clamp(24px, 4vw, 36px); font-weight: 800; color: white; letter-spacing: -1px; margin-bottom: 12px; }
        .cta-sub { font-size: 15px; color: rgba(255,255,255,.75); margin-bottom: 32px; }
        .cta-btn {
          padding: 14px 40px; background: white; color: #4f46e5;
          border: none; border-radius: 10px; font-size: 15px; font-weight: 700;
          cursor: pointer; transition: transform .15s, opacity .15s;
        }
        .cta-btn:hover { transform: scale(1.04); opacity: .92; }

        /* FOOTER */
        .footer {
          padding: 28px 32px; background: #1a1f36;
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
        }
        .footer-logo { display: flex; align-items: center; gap: 8px; }
        .footer-logo-icon { width: 24px; height: 24px; background: #4f46e5; border-radius: 5px; display: flex; align-items: center; justify-content: center; }
        .footer-logo-name { font-size: 13px; font-weight: 600; color: #94a3b8; }
        .footer-copy { font-size: 12px; color: #475569; }

        /* LOGIN SHEET */
        .overlay {
          position: fixed; inset: 0; background: rgba(15,15,30,0.5);
          z-index: 200; display: flex; align-items: flex-end; justify-content: center;
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

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* TOP NAVIGATION */}
      <nav className={`nav${navScrolled ? ' scrolled' : ''}`}>
        <div className="nav-logo">
          <div className="nav-logo-icon">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
              <rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 7h8M8 12h5"/>
            </svg>
          </div>
          <span className="nav-logo-name">PrintCalc Pro</span>
        </div>
        <div className="nav-btns">
          <button className="nav-login" onClick={() => openSheet(false)}>Нэвтрэх</button>
          <button className="nav-register" onClick={() => openSheet(true)}>Бүртгүүлэх</button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-logo-wrap">
          <svg ref={svgRef} width="72" height="72" viewBox="0 0 75 80" fill="none" />
        </div>
        <div className="hero-badge">
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          Хэвлэлийн тооцоолуур
        </div>
        <h1 className="hero-title">
          Хэвлэлийн <span>зардлаа</span> хэдхэн<br/>секундэд тооцоол
        </h1>
        <p className="hero-sub">
          Цаасны хэмжээ, материал, тоо ширхэг оруулахад л нэгж өртөг,
          байршуулалт, НӨАТ бүгд автоматаар тооцогдоно.
        </p>
        <div className="hero-btns">
          <button className="btn-primary" onClick={() => openSheet(true)}>Үнэгүй эхлэх →</button>
          <button className="btn-secondary" onClick={() => {
            document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })
          }}>Үнийн мэдээлэл</button>
        </div>
        <div className="hero-stats">
          {[['5 сек', 'Тооцооны хугацаа'], ['100%', 'Нарийвчлал'], ['PDF', 'Үнийн санал'], ['∞', 'Хадгалалт']].map(([v, l]) => (
            <div className="stat-item" key={l}>
              <div className="stat-val">{v}</div>
              <div className="stat-lbl">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="section" id="features">
        <div className="section-inner">
          <span className="section-badge">Боломжууд</span>
          <h2 className="section-title">Хэвлэлийн ажлыг хялбарчилна</h2>
          <p className="section-sub">Хэвлэлийн компаниудад зориулагдсан мэргэжлийн тооцооллын систем.</p>
          <div className="features-grid">
            {features.map(f => (
              <div className="feature-card" key={f.title}>
                <div className="feature-icon">{f.icon}</div>
                <div className="feature-title">{f.title}</div>
                <div className="feature-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="pricing-section" id="pricing">
        <div className="pricing-inner">
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <span className="section-badge">Үнийн мэдээлэл</span>
            <h2 className="section-title">Хэрэгцээндээ тохирсон</h2>
            <p className="section-sub" style={{ margin: '0 auto' }}>Үнэгүй хувилбараас эхлэн, бизнесийнхээ хэрэгцээнд нийцүүлнэ.</p>
          </div>
          <div className="plans-grid">
            {plans.map(plan => (
              <div
                className="plan-card"
                key={plan.name}
                style={{ background: plan.bg, border: `1.5px solid ${plan.border}` }}
              >
                {plan.badge && <div className="plan-badge">{plan.badge}</div>}
                <div className="plan-name" style={{ color: plan.color }}>{plan.name}</div>
                <div className="plan-price" style={{ color: plan.color }}>{plan.price}</div>
                <div className="plan-sub">{plan.sub}</div>
                <div className="plan-divider" />
                {plan.features.map(f => (
                  <div className={`plan-feat ${f.ok ? 'plan-feat-ok' : 'plan-feat-no'}`} key={f.text}>
                    <svg className="check-icon" width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke={f.ok ? '#10b981' : '#cbd5e1'} strokeWidth="2.5">
                      {f.ok
                        ? <polyline points="20 6 9 17 4 12"/>
                        : <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                      }
                    </svg>
                    {f.text}
                  </div>
                ))}
                <button className="plan-btn" style={plan.btnStyle} onClick={plan.ctaAction}>
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2 className="cta-title">Өнөөдөр эхлэнэ үү</h2>
        <p className="cta-sub">Бүртгүүлэхэд нэг минут ч хэрэггүй. Шууд ашиглаж эхлэнэ.</p>
        <button className="cta-btn" onClick={() => openSheet(true)}>Үнэгүй бүртгүүлэх →</button>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-logo">
          <div className="footer-logo-icon">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
              <rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 7h8M8 12h5"/>
            </svg>
          </div>
          <span className="footer-logo-name">PrintCalc Pro</span>
        </div>
        <div className="footer-copy">© 2025 PrintCalc Pro. Бүх эрх хуулиар хамгаалагдсан.</div>
      </footer>

      {/* LOGIN/REGISTER SHEET */}
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
