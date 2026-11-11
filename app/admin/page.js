'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const C = {
  bg: '#f4f6fb', surface: '#ffffff', border: '#e2e8f3', borderHover: '#c5d0e8',
  accent: '#4f7cff', accentGlow: 'rgba(79,124,255,0.10)',
  success: '#10b981', warn: '#f59e0b', danger: '#ef4444',
  text: '#111827', textMid: '#4b5a7a', textDim: '#9aa5bf',
  purple: '#7c3aed', sidebar: '#ffffff',
}

const card = {
  background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`,
  padding: '18px 20px', marginBottom: 16,
}

const miniBtn = {
  padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, cursor: 'pointer',
  border: `1px solid ${C.border}`, background: '#fff', color: C.textMid, marginRight: 4,
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading]   = useState(true)
  const [data, setData]         = useState(null)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [tab, setTab]           = useState('users')   // users | payments | calcs | feedbacks
  const [feedbacks, setFeedbacks] = useState([])
  const [fbLoading, setFbLoading] = useState(false)
  const [payments, setPayments]   = useState([])
  const [payLoading, setPayLoading] = useState(false)
  const [paySetupMissing, setPaySetupMissing] = useState(false)
  const [payFilter, setPayFilter] = useState('pending')   // pending | all
  const [confirm, setConfirm]     = useState(null)        // { id, action } — 2 алхамт баталгаа
  const [rejectNote, setRejectNote] = useState('')
  const [acting, setActing]       = useState(false)
  const [actMsg, setActMsg]       = useState('')

  useEffect(() => { fetchData() }, [])

  async function fetchFeedbacks() {
    setFbLoading(true)
    try {
      const r = await fetch('/api/admin/feedbacks')
      const d = await r.json()
      if (!d.error) setFeedbacks(d.feedbacks)
    } finally { setFbLoading(false) }
  }

  function openTab(id) {
    setTab(id)
    setConfirm(null); setActMsg('')
    if (id === 'feedbacks') fetchFeedbacks()
    if (id === 'payments') fetchPayments()
  }

  async function fetchPayments() {
    setPayLoading(true)
    try {
      const r = await fetch('/api/admin/payments', { cache: 'no-store' })
      const d = await r.json()
      if (!d.error) { setPayments(d.payments || []); setPaySetupMissing(!!d.setupMissing) }
    } finally { setPayLoading(false) }
  }

  // Төлбөр батлах / татгалзах
  async function actPayment(id, action) {
    setActing(true); setActMsg('')
    try {
      const r = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, note: action === 'reject' ? rejectNote : null }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setActMsg('⚠ ' + (d.error || 'Алдаа гарлаа')); return }
      setActMsg(action === 'approve'
        ? `✓ Батлагдлаа. Pro эрх ${new Date(d.expires_at).toLocaleDateString('mn-MN')} хүртэл.`
        : '✓ Татгалзлаа.')
      setConfirm(null); setRejectNote('')
      await Promise.all([fetchPayments(), fetchData(true)])
    } finally { setActing(false) }
  }

  // Хэрэглэгчид гараар Pro өгөх / хасах
  async function grant(userId, action) {
    setActing(true); setActMsg('')
    try {
      const r = await fetch('/api/admin/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_user_id: userId, action }),
      })
      const d = await r.json().catch(() => ({}))
      setActMsg(r.ok ? (action === 'grant' ? '✓ Pro эрх өглөө.' : '✓ Pro эрхийг хаслаа.') : '⚠ ' + (d.error || 'Алдаа гарлаа'))
      setConfirm(null)
      if (r.ok) await fetchData(true)
    } finally { setActing(false) }
  }

  async function markRead(id) {
    await fetch('/api/admin/feedbacks', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setFeedbacks(fb => fb.map(f => f.id === id ? { ...f, is_read: true } : f))
  }

  async function fetchData(silent = false) {
    if (!silent) setLoading(true)
    setError('')
    try {
      const r = await fetch('/api/admin/data')
      const d = await r.json()
      if (d.error) {
        if (r.status === 403) {
          router.push('/dashboard')
          return
        }
        setError(d.error)
      } else {
        setData(d)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }


  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const filteredUsers = (data?.users || []).filter(u => {
    const q = search.toLowerCase()
    return !q ||
      u.email?.toLowerCase().includes(q) ||
      u.profile?.company_name?.toLowerCase().includes(q)
  })

  const fmt = n => Math.round(n).toLocaleString()

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', color: C.textMid, fontSize: 14, fontFamily:'var(--app-font)' }}>
      Ачааллаж байна...
    </div>
  )

  if (error) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center',
      justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily:'var(--app-font)' }}>
      <div style={{ fontSize: 32 }}>⚠️</div>
      <div style={{ color: C.danger, fontSize: 14 }}>{error}</div>
      <button onClick={() => fetchData()} style={{ padding: '8px 20px', background: C.accent, color: 'white',
        border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Дахин оролдох</button>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily:'var(--app-font)',
      color: C.text, display: 'flex' }}>
      <style>{`
        *{box-sizing:border-box}
        .row-hover:hover{background:${C.bg}!important}
        .btn-ghost:hover{background:${C.bg}!important}
        input:focus,select:focus{border-color:${C.accent}!important;outline:none}
        ::-webkit-scrollbar{width:5px}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:10px}
      `}</style>

      {/* ── SIDEBAR ── */}
      <div style={{ width: 210, background: C.sidebar, borderRight: `1.5px solid ${C.border}`,
        boxShadow: '2px 0 12px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 10 }}>

        <div style={{ padding: '18px 16px 20px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{ width: 28, height: 28, background: C.danger, borderRadius: 7,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>PrintCalc</div>
              <div style={{ fontSize: 9, color: C.danger, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }}>Admin</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '12px 8px', flex: 1 }}>
          {[
            { id: 'users', label: 'Хэрэглэгчид', icon: <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>, icon2: <circle cx="9" cy="7" r="4"/> },
            { id: 'payments',  label: 'Төлбөр',     icon: <><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></> },
            { id: 'calcs',     label: 'Тооцоонууд', icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></> },
            { id: 'feedbacks', label: 'Саналууд',   icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/> },
          ].map(t => (
            <button key={t.id} onClick={() => openTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', width: '100%',
              background: tab === t.id ? C.accentGlow : 'none',
              color: tab === t.id ? C.accent : C.textMid,
              border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12,
              fontWeight: tab === t.id ? 700 : 500, marginBottom: 2, textAlign: 'left',
            }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                {t.icon}{t.icon2}
              </svg>
              <span style={{ flex: 1, textAlign: 'left' }}>{t.label}</span>
              {t.id === 'payments' && data?.stats.pending_payments > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, background: C.warn,
                  color: 'white', borderRadius: 10, padding: '1px 6px', lineHeight: 1.4 }}>
                  {data.stats.pending_payments}
                </span>
              )}
              {t.id === 'feedbacks' && feedbacks.filter(f => !f.is_read).length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, background: C.danger,
                  color: 'white', borderRadius: 10, padding: '1px 6px', lineHeight: 1.4 }}>
                  {feedbacks.filter(f => !f.is_read).length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ padding: '12px 8px', borderTop: `1px solid ${C.border}` }}>
          <button onClick={() => router.push('/dashboard')} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', width: '100%',
            background: 'none', color: C.textMid, border: 'none', borderRadius: 8,
            cursor: 'pointer', fontSize: 12, marginBottom: 4, textAlign: 'left',
          }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Dashboard
          </button>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', width: '100%',
            background: 'none', color: C.danger, border: 'none', borderRadius: 8,
            cursor: 'pointer', fontSize: 12, textAlign: 'left',
          }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Гарах
          </button>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ marginLeft: 210, flex: 1, padding: '24px', overflowY: 'auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.5px' }}>Удирдлагын самбар</div>
            <div style={{ fontSize: 13, color: C.textMid, marginTop: 3 }}>
              {new Date().toLocaleDateString('mn-MN', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
          <button onClick={() => { fetchData(); if (tab === 'payments') fetchPayments() }} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px',
            background: C.surface, border: `1.5px solid ${C.border}`, borderRadius: 8,
            color: C.textMid, fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Шинэчлэх
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Нийт хэрэглэгч',  value: data?.stats.total_users, color: C.accent,  icon: '👥' },
            { label: 'Pro хэрэглэгч',   value: data?.stats.pro_users,   color: C.warn,    icon: '⭐' },
            { label: 'Өнөөдрийн тооцоо', value: data?.stats.today_calcs, color: C.purple,  icon: '📈' },
            { label: 'Батлагдсан орлого', value: '₮' + (data?.stats.revenue || 0).toLocaleString(), raw: true, color: C.success, icon: '💰' },
          ].map(s => (
            <div key={s.label} style={{ ...card, marginBottom: 0, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.color }}/>
              <div style={{ fontSize: 10, color: C.textMid, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '.06em', marginBottom: 8 }}>{s.icon} {s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color, letterSpacing: '-1px' }}>
                {s.raw ? s.value : s.value?.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        {actMsg && (
          <div style={{ ...card, padding: '10px 14px', fontSize: 13, fontWeight: 600,
            color: actMsg.startsWith('✓') ? C.success : C.danger }}>{actMsg}</div>
        )}

        {/* PAYMENTS TAB */}
        {tab === 'payments' && (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Төлбөрийн хүсэлт</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['pending', 'Хүлээгдэж буй'], ['all', 'Бүгд']].map(([id, label]) => (
                  <button key={id} onClick={() => setPayFilter(id)} style={{ ...miniBtn,
                    background: payFilter === id ? C.accentGlow : '#fff', color: payFilter === id ? C.accent : C.textMid }}>{label}</button>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 12, color: C.textMid, marginBottom: 14, lineHeight: 1.6 }}>
              Банкны апп-аасаа <b>гүйлгээний утга дахь код</b> болон <b>дүнг</b> тулгаад батална уу. Батлахад Pro эрх автоматаар нээгдэж, идэвхтэй эрх дээр нэмэгдэнэ.
            </div>
            {paySetupMissing && (
              <div style={{ padding: '10px 12px', background: '#fefce8', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#854d0e', marginBottom: 12 }}>
                Өгөгдлийн сангийн хүснэгт үүсээгүй байна. Supabase дээр <code>supabase/migrations/20261111_billing.sql</code>-ийг ажиллуулна уу.
              </div>
            )}
            {payLoading ? (
              <div style={{ textAlign: 'center', padding: 40, color: C.textMid, fontSize: 13 }}>Ачааллаж байна...</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                      {['Код', 'Компани / имэйл', 'Дүн', 'Хугацаа', 'Огноо', 'Төлөв', ''].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700,
                          color: C.textMid, textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {payments.filter(p => payFilter === 'all' || p.status === 'pending').map(p => (
                      <tr key={p.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}`, verticalAlign: 'top' }}>
                        <td style={{ padding: '10px', fontFamily: 'ui-monospace,Menlo,monospace', fontWeight: 700, color: C.accent, letterSpacing: '.05em' }}>{p.ref_code}</td>
                        <td style={{ padding: '10px' }}>
                          <div style={{ fontWeight: 600 }}>{p.company || '—'}</div>
                          <div style={{ fontSize: 11, color: C.textMid }}>{p.email}{p.phone ? ` · ${p.phone}` : ''}</div>
                        </td>
                        <td style={{ padding: '10px', fontWeight: 700 }}>₮{p.amount.toLocaleString()}</td>
                        <td style={{ padding: '10px', color: C.textMid }}>{p.months} сар</td>
                        <td style={{ padding: '10px', color: C.textMid, fontSize: 12, whiteSpace: 'nowrap' }}>
                          {new Date(p.created_at).toLocaleString('mn-MN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={{ padding: '10px', fontSize: 12, fontWeight: 700,
                          color: p.status === 'approved' ? C.success : p.status === 'rejected' ? C.danger : C.warn }}>
                          {p.status === 'approved' ? 'Батлагдсан' : p.status === 'rejected' ? 'Татгалзсан' : 'Хүлээгдэж буй'}
                          {p.note && <div style={{ fontWeight: 400, color: C.textMid }}>{p.note}</div>}
                        </td>
                        <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                          {p.status === 'pending' && (confirm?.id === p.id ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 210 }}>
                              <div style={{ fontSize: 11, color: C.textMid, whiteSpace: 'normal' }}>
                                {confirm.action === 'approve'
                                  ? <>Данс руу <b>₮{p.amount.toLocaleString()}</b>, утга нь <b>{p.ref_code}</b> гүйлгээ орсон уу?</>
                                  : 'Татгалзах шалтгаан (хэрэглэгчид харагдана):'}
                              </div>
                              {confirm.action === 'reject' && (
                                <input value={rejectNote} onChange={e => setRejectNote(e.target.value)} maxLength={500}
                                  placeholder="Жишээ: төлбөр ороогүй"
                                  style={{ padding: '5px 8px', fontSize: 12, border: `1.5px solid ${C.border}`, borderRadius: 6 }}/>
                              )}
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button disabled={acting} onClick={() => actPayment(p.id, confirm.action)}
                                  style={{ ...miniBtn, color: '#fff', borderColor: 'transparent',
                                    background: confirm.action === 'approve' ? C.success : C.danger }}>
                                  {acting ? '...' : confirm.action === 'approve' ? 'Тийм, батлах' : 'Татгалзах'}
                                </button>
                                <button onClick={() => { setConfirm(null); setRejectNote('') }} style={miniBtn}>Болих</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => setConfirm({ id: p.id, action: 'approve' })}
                                style={{ ...miniBtn, background: C.success, color: '#fff', borderColor: C.success }}>Батлах</button>
                              <button onClick={() => setConfirm({ id: p.id, action: 'reject' })}
                                style={{ ...miniBtn, color: C.danger }}>Татгалзах</button>
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                    {payments.filter(p => payFilter === 'all' || p.status === 'pending').length === 0 && (
                      <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: C.textDim, fontSize: 13 }}>
                        {payFilter === 'pending' ? 'Хүлээгдэж буй төлбөр алга' : 'Төлбөрийн хүсэлт алга'}
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* USERS TAB */}
        {tab === 'users' && (
          <div style={card}>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Нэр, имэйл хайх..."
                style={{ flex: 1, minWidth: 200, padding: '8px 12px', fontSize: 13, border: `1.5px solid ${C.border}`,
                  borderRadius: 8, background: '#fff', color: C.text }}
              />
<div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.textMid }}>
                <span style={{ fontWeight: 600, color: C.text }}>{filteredUsers.length}</span> хэрэглэгч
              </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                    {['Компани', 'Имэйл', 'Тооцоо', 'Эрх', 'Бүртгэсэн'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11,
                        fontWeight: 700, color: C.textMid, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => {
                    return (
                      <tr key={u.id} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 30, height: 30, borderRadius: '50%', background: C.accentGlow,
                              border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.accent,
                              flexShrink: 0, overflow: 'hidden' }}>
                              {u.profile?.logo_url
                                ? <img src={u.profile.logo_url} alt="" style={{ width: 30, height: 30, objectFit: 'cover' }}/>
                                : (u.profile?.company_name || u.email || '?').slice(0, 2).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600, color: C.text }}>
                              {u.profile?.company_name || <span style={{ color: C.textDim, fontStyle: 'italic' }}>Тохируулаагүй</span>}
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px', color: C.textMid, fontSize: 12 }}>{u.email}</td>
                        <td style={{ padding: '10px 12px', color: C.text, fontWeight: 600, textAlign: 'center' }}>
                          {u.calc_count}
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: 12, whiteSpace: 'nowrap' }}>
                          {u.pro
                            ? <span style={{ color: '#b45309', fontWeight: 700 }}>⭐ Pro{u.subscription?.expires_at ? ` · ${new Date(u.subscription.expires_at).toLocaleDateString('mn-MN')}` : ''}</span>
                            : <span style={{ color: C.textDim }}>Үнэгүй</span>}
                          {confirm?.id === u.id ? (
                            <span style={{ marginLeft: 8 }}>
                              <button disabled={acting} onClick={() => grant(u.id, confirm.action)} style={{ ...miniBtn, background: C.accent, color: '#fff', borderColor: C.accent }}>Тийм</button>
                              <button onClick={() => setConfirm(null)} style={miniBtn}>Үгүй</button>
                            </span>
                          ) : (
                            <button onClick={() => setConfirm({ id: u.id, action: u.pro ? 'revoke' : 'grant' })} style={{ ...miniBtn, marginLeft: 8 }}>
                              {u.pro ? 'Хасах' : 'Pro өгөх'}
                            </button>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', color: C.textMid, fontSize: 12 }}>
                          {new Date(u.created_at).toLocaleDateString('mn-MN')}
                        </td>
                      </tr>
                    )
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: C.textDim, fontSize: 13 }}>
                        Хэрэглэгч олдсонгүй
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CALCS TAB */}
        {tab === 'calcs' && (
          <div style={card}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>
              Сүүлийн 20 тооцоо
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${C.border}` }}>
                    {['Компани', 'Имэйл', 'Нэр', 'Хэмжээ', 'Тоо ширхэг', 'Дүн (₮)', 'Огноо'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11,
                        fontWeight: 700, color: C.textMid, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(data?.recent_calcs || []).map((c, i) => (
                    <tr key={i} className="row-hover" style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '10px 12px', fontWeight: 600 }}>{c.company}</td>
                      <td style={{ padding: '10px 12px', color: C.textMid, fontSize: 12 }}>{c.email}</td>
                      <td style={{ padding: '10px 12px', color: C.textMid }}>{c.name || '—'}</td>
                      <td style={{ padding: '10px 12px', color: C.textMid }}>{c.paper_size || '—'}</td>
                      <td style={{ padding: '10px 12px', color: C.text, fontWeight: 600 }}>
                        {c.qty?.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px', color: C.accent, fontWeight: 700 }}>
                        ₮{c.total?.toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px', color: C.textMid, fontSize: 12 }}>
                        {new Date(c.created_at).toLocaleDateString('mn-MN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* FEEDBACKS TAB */}
        {tab === 'feedbacks' && (
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>
                Хэрэглэгчдийн санал хүсэлт
                {feedbacks.filter(f => !f.is_read).length > 0 && (
                  <span style={{ marginLeft: 8, fontSize: 12, color: C.danger, fontWeight: 600 }}>
                    ({feedbacks.filter(f => !f.is_read).length} уншаагүй)
                  </span>
                )}
              </div>
              <button onClick={fetchFeedbacks} style={{ padding: '6px 12px', background: C.bg,
                border: `1.5px solid ${C.border}`, borderRadius: 7, fontSize: 12,
                color: C.textMid, cursor: 'pointer', fontWeight: 600 }}>
                Шинэчлэх
              </button>
            </div>

            {fbLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: C.textMid, fontSize: 13 }}>
                Ачааллаж байна...
              </div>
            ) : feedbacks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: C.textDim, fontSize: 13 }}>
                Санал хүсэлт байхгүй байна
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {feedbacks.map(f => (
                  <div key={f.id} style={{
                    border: `1px solid ${f.is_read ? C.border : '#bfdbfe'}`,
                    background: f.is_read ? C.surface : '#eff6ff',
                    borderRadius: 10, padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
                            {f.company_name || '—'}
                          </span>
                          <span style={{ fontSize: 11, color: C.textMid, marginLeft: 8 }}>{f.email || 'Нэвтрээгүй'}</span>
                        </div>
                        {!f.is_read && (
                          <span style={{ fontSize: 10, fontWeight: 700, background: C.accent,
                            color: 'white', padding: '1px 7px', borderRadius: 10 }}>Шинэ</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {f.rating && (
                          <span style={{ fontSize: 13 }}>{'⭐'.repeat(f.rating)}</span>
                        )}
                        <span style={{ fontSize: 11, color: C.textDim }}>
                          {new Date(f.created_at).toLocaleDateString('mn-MN')}
                        </span>
                        {!f.is_read && (
                          <button onClick={() => markRead(f.id)} style={{
                            padding: '4px 10px', background: 'none', border: `1px solid ${C.border}`,
                            borderRadius: 6, fontSize: 11, color: C.textMid, cursor: 'pointer', fontWeight: 600,
                          }}>✓ Уншсан</button>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {f.message}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
