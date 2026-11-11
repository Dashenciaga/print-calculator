'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

// Нэг хуудас хоёр үүрэгтэй:
//  1) Нэвтрээгүй бол → и-мэйл рүү сэргээх холбоос илгээнэ
//  2) И-мэйлийн холбоосоор орж ирсэн (эсвэл нэвтэрсэн) бол → шинэ нууц үг тохируулна

const s = {
  page:  { minHeight:'100vh', background:'#f8f9fb', display:'flex', alignItems:'center', justifyContent:'center', padding:16, fontFamily:'system-ui,-apple-system,sans-serif' },
  card:  { width:'100%', maxWidth:420, background:'white', border:'1px solid #e2e8f0', borderRadius:16, padding:'28px 28px 24px', boxShadow:'0 12px 40px rgba(15,23,42,.06)' },
  title: { fontSize:20, fontWeight:700, color:'#1a1f36', textAlign:'center', marginBottom:4 },
  sub:   { fontSize:13, color:'#64748b', textAlign:'center', marginBottom:22, lineHeight:1.5 },
  label: { display:'block', fontSize:12, fontWeight:500, color:'#374151', marginBottom:5 },
  input: { width:'100%', padding:'10px 13px', fontSize:14, border:'1.5px solid #e2e8f0', borderRadius:10, color:'#1a1f36', outline:'none', marginBottom:13, boxSizing:'border-box' },
  btn:   { width:'100%', padding:12, background:'#4f46e5', color:'white', border:'none', borderRadius:10, fontSize:15, fontWeight:600, cursor:'pointer' },
  ok:    { padding:'10px 13px', borderRadius:9, fontSize:13, marginBottom:13, background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#166534', lineHeight:1.5 },
  err:   { padding:'10px 13px', borderRadius:9, fontSize:13, marginBottom:13, background:'#fef2f2', border:'1px solid #fecaca', color:'#991b1b', lineHeight:1.5 },
  back:  { display:'block', textAlign:'center', marginTop:14, fontSize:13, color:'#4f46e5', textDecoration:'none' },
}

// Supabase-ийн англи алдааг ойлгомжтой болгоно
function mnError(msg = '') {
  if (/different from the old/i.test(msg)) return 'Шинэ нууц үг хуучнаасаа өөр байх ёстой.'
  if (/at least|should be at least/i.test(msg)) return 'Нууц үг хамгийн багадаа 6 тэмдэгт байна.'
  if (/security purposes|rate limit|after \d+ seconds/i.test(msg)) return 'Хэт олон удаа илгээлээ. Түр хүлээгээд дахин оролдоно уу.'
  if (/code verifier|invalid flow state|expired|invalid/i.test(msg)) return 'Холбоосны хугацаа дууссан эсвэл буруу байна. Шинээр илгээнэ үү. Холбоосыг хүсэлт илгээсэн хөтөч дээрээ нээгээрэй.'
  return msg || 'Алдаа гарлаа. Дахин оролдоно уу.'
}

export default function ResetPassword() {
  const router = useRouter()
  const [phase, setPhase]       = useState('checking') // checking | request | sent | set | done
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const url  = new URL(window.location.href)
      const hash = new URLSearchParams(url.hash.slice(1))
      const linkError = url.searchParams.get('error_description') || hash.get('error_description')

      // Холбоосон дахь code / token-ийг клиент өөрөө уншина; getSession үүнийг хүлээнэ
      let { data: { session } } = await supabase.auth.getSession()

      if (!session && hash.get('access_token') && hash.get('refresh_token')) {
        const { data } = await supabase.auth.setSession({
          access_token:  hash.get('access_token'),
          refresh_token: hash.get('refresh_token'),
        })
        session = data.session
      }
      if (!session && url.searchParams.get('token_hash')) {
        const { data } = await supabase.auth.verifyOtp({ token_hash: url.searchParams.get('token_hash'), type: 'recovery' })
        session = data.session
      }
      if (!session && url.searchParams.get('code')) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(url.searchParams.get('code'))
        session = data.session
        if (error) setError(mnError(error.message))
      }

      // Хаягийн мөрөөс код, токеныг цэвэрлэнэ
      if (url.search || url.hash) window.history.replaceState(null, '', '/reset-password')

      if (session) {
        setEmail(session.user?.email || '')
        setPhase('set')
      } else {
        if (linkError) setError(mnError(linkError))
        setPhase('request')
      }
    }
    init()
  }, [])

  async function sendLink(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) setError(mnError(error.message))
    else setPhase('sent')
  }

  async function savePassword(e) {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Нууц үг хамгийн багадаа 6 тэмдэгт байна.'); return }
    if (password !== confirm) { setError('Хоёр нууц үг таарахгүй байна.'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setError(mnError(error.message)); return }
    setPhase('done')
    setTimeout(() => router.push('/'), 1500)
  }

  return (
    <main style={s.page}>
      <div style={s.card}>
        {phase === 'checking' && <div style={s.sub}>Ачааллаж байна...</div>}

        {phase === 'request' && (
          <form onSubmit={sendLink}>
            <div style={s.title}>Нууц үг сэргээх</div>
            <div style={s.sub}>Бүртгэлтэй и-мэйлээ оруулаарай. Шинэ нууц үг тохируулах холбоос илгээнэ.</div>
            <label style={s.label}>И-мэйл хаяг</label>
            <input style={s.input} type="email" required autoFocus placeholder="name@company.com"
              value={email} onChange={e => setEmail(e.target.value)} />
            {error && <div style={s.err}>{error}</div>}
            <button style={{ ...s.btn, opacity: loading ? .6 : 1 }} type="submit" disabled={loading}>
              {loading ? 'Илгээж байна...' : 'Холбоос илгээх'}
            </button>
            <Link href="/" style={s.back}>← Нэвтрэх рүү буцах</Link>
          </form>
        )}

        {phase === 'sent' && (
          <>
            <div style={s.title}>И-мэйлээ шалгаарай</div>
            <div style={s.ok}>
              <b>{email}</b> хаяг бүртгэлтэй бол сэргээх холбоос очлоо.
              Холбоосыг <b>энэ хөтөч дээрээ</b> нээгээрэй. Ирээгүй бол Spam хавтсаа шалгана уу.
            </div>
            <button style={s.btn} onClick={() => { setPhase('request'); setError('') }}>Дахин илгээх</button>
            <Link href="/" style={s.back}>← Нүүр хуудас</Link>
          </>
        )}

        {phase === 'set' && (
          <form onSubmit={savePassword}>
            <div style={s.title}>Шинэ нууц үг</div>
            <div style={s.sub}>{email ? <><b>{email}</b> бүртгэлийн </> : ''}шинэ нууц үгээ оруулна уу.</div>
            <label style={s.label}>Шинэ нууц үг</label>
            <input style={s.input} type="password" required autoFocus minLength={6} placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} />
            <label style={s.label}>Дахин оруулах</label>
            <input style={s.input} type="password" required minLength={6} placeholder="••••••••"
              value={confirm} onChange={e => setConfirm(e.target.value)} />
            {error && <div style={s.err}>{error}</div>}
            <button style={{ ...s.btn, opacity: loading ? .6 : 1 }} type="submit" disabled={loading}>
              {loading ? 'Хадгалж байна...' : 'Нууц үг хадгалах'}
            </button>
          </form>
        )}

        {phase === 'done' && (
          <>
            <div style={s.title}>Амжилттай!</div>
            <div style={s.ok}>Нууц үг шинэчлэгдлээ. Таныг нэвтрүүлж байна...</div>
          </>
        )}
      </div>
    </main>
  )
}
