'use client'
import { useEffect, useState } from 'react'

const FEATURES = [
  'Үнийн санал үүсгэх (давхцахгүй дугаартай)',
  'PDF татах, хэвлэх',
  'Үйлчлүүлэгч рүү и-мэйлээр шууд илгээх',
  'Компанийн лого, банкны мэдээлэлтэй',
  'Тоо ширхэг бүрийн үнийн хүснэгт',
]

const s = {
  overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center', padding:16 },
  box:     { background:'#fff', borderRadius:16, width:440, maxWidth:'100%', padding:'26px 26px 22px', boxShadow:'0 28px 80px rgba(0,0,0,.22)', position:'relative', fontFamily:'var(--app-font)', color:'#1a1f36' },
  close:   { position:'absolute', top:12, right:14, background:'none', border:'none', fontSize:22, color:'#94a3b8', cursor:'pointer' },
  title:   { fontSize:19, fontWeight:700, textAlign:'center', marginBottom:4 },
  sub:     { fontSize:12.5, color:'#64748b', textAlign:'center', marginBottom:18, lineHeight:1.5 },
  card:    { background:'#f4f6fb', borderRadius:12, padding:'14px 16px', marginBottom:16 },
  price:   { display:'flex', justifyContent:'space-between', alignItems:'baseline', paddingBottom:12, marginBottom:10, borderBottom:'1px solid #e2e8f3' },
  feat:    { display:'flex', gap:8, fontSize:13, padding:'4px 0' },
  btn:     { width:'100%', padding:13, background:'#4f46e5', color:'#fff', border:'none', borderRadius:10, fontSize:14, fontWeight:700, cursor:'pointer' },
  btnOut:  { width:'100%', padding:11, background:'#fff', color:'#4f46e5', border:'1.5px solid #c7d2fe', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', marginTop:8 },
  row:     { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #e2e8f3', fontSize:13, gap:10 },
  lbl:     { color:'#64748b' },
  val:     { fontWeight:700, textAlign:'right', wordBreak:'break-all' },
  copy:    { marginLeft:8, fontSize:11, padding:'2px 8px', border:'1px solid #c7d2fe', borderRadius:6, background:'#fff', color:'#4f46e5', cursor:'pointer', whiteSpace:'nowrap' },
  code:    { fontFamily:'ui-monospace,Menlo,monospace', fontSize:16, letterSpacing:'.08em', color:'#4f46e5' },
  note:    { fontSize:12, color:'#64748b', lineHeight:1.6, margin:'12px 0 0' },
  warn:    { fontSize:12.5, background:'#fefce8', border:'1px solid #fde68a', color:'#854d0e', borderRadius:9, padding:'10px 12px', marginBottom:12, lineHeight:1.5 },
  err:     { fontSize:12.5, background:'#fef2f2', border:'1px solid #fecaca', color:'#991b1b', borderRadius:9, padding:'10px 12px', marginBottom:12, lineHeight:1.5 },
  ok:      { fontSize:13, background:'#f0fdf4', border:'1px solid #bbf7d0', color:'#166534', borderRadius:9, padding:'12px 14px', lineHeight:1.6, textAlign:'center' },
}

const fmt = n => '₮' + Number(n || 0).toLocaleString('en-US')
const date = iso => iso ? new Date(iso).toLocaleDateString('mn-MN', { year:'numeric', month:'long', day:'numeric' }) : ''

export default function UpgradeModal({ onClose, onChange }) {
  const [st, setSt]         = useState(null)
  const [busy, setBusy]     = useState(false)
  const [err, setErr]       = useState('')
  const [copied, setCopied] = useState('')

  function fetchStatus() {
    return fetch('/api/billing/status', { cache: 'no-store' })
      .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, d })))
  }

  function apply({ ok, d }) {
    if (!ok) { setErr(d.error || 'Мэдээлэл ачаалж чадсангүй'); return }
    setSt(d)
    onChange?.(d)
  }

  async function load() { apply(await fetchStatus()) }

  useEffect(() => {
    let alive = true
    fetchStatus().then(res => { if (alive) apply(res) })
    return () => { alive = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function createRequest() {
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/billing/request', { method: 'POST' })
      const d = await r.json().catch(() => ({}))
      if (!r.ok) { setErr(d.error || 'Хүсэлт үүсгэж чадсангүй'); return }
      await load()
    } finally { setBusy(false) }
  }

  async function refresh() {
    setBusy(true); setErr('')
    try { await load() } finally { setBusy(false) }
  }

  function copy(key, text) {
    navigator.clipboard?.writeText(String(text)).then(() => {
      setCopied(key); setTimeout(() => setCopied(''), 1500)
    }).catch(() => {})
  }

  // Мөр: харагдах утга (display) ба хуулах утга (value) тусдаа
  const row = (k, label, value, display, mono) => (
    <div style={s.row} key={k}>
      <span style={s.lbl}>{label}</span>
      <span style={{ display:'flex', alignItems:'center' }}>
        <span style={mono ? { ...s.val, ...s.code } : s.val}>{display ?? value}</span>
        <button type="button" style={s.copy} onClick={() => copy(k, value)}>{copied === k ? '✓' : 'Хуулах'}</button>
      </span>
    </div>
  )

  let body
  if (!st) {
    body = err ? <div style={s.err}>{err}</div> : <div style={{ ...s.sub, padding:'30px 0' }}>Ачааллаж байна...</div>
  } else if (st.pro) {
    body = (
      <>
        <div style={s.title}>⭐ Pro эрх идэвхтэй</div>
        <div style={s.ok}>
          {st.expires_at ? <>Таны эрх <b>{date(st.expires_at)}</b> хүртэл хүчинтэй.</> : 'Таны эрх хугацаагүй.'}
          <br/>Үнийн санал, PDF, и-мэйл бүгд нээлттэй.
        </div>
        <button style={s.btnOut} onClick={onClose}>Хаах</button>
      </>
    )
  } else if (st.pending) {
    const p = st.pending
    body = (
      <>
        <div style={s.title}>Төлбөр шилжүүлэх</div>
        <div style={s.sub}>Доорх данс руу шилжүүлж, <b>гүйлгээний утгад кодоо заавал бичнэ үү</b>.</div>
        {err && <div style={s.err}>{err}</div>}
        <div style={s.card}>
          {row('bank', 'Банк', st.bank.name)}
          {row('acc', 'Дансны дугаар', st.bank.account)}
          {row('holder', 'Хүлээн авагч', st.bank.holder)}
          {row('amount', 'Дүн', p.amount, fmt(p.amount))}
          {row('code', 'Гүйлгээний утга', p.ref_code, null, true)}
        </div>
        <div style={s.warn}>
          Төлбөр орсныг шалгаад таны эрхийг нээнэ. Код буруу эсвэл дүн дутуу бол батлах боломжгүй.
        </div>
        <button style={s.btn} onClick={refresh} disabled={busy}>{busy ? 'Шалгаж байна...' : 'Төлөв шалгах'}</button>
        <button style={s.btnOut} onClick={onClose}>Дараа шалгана</button>
        <p style={s.note}>Хүсэлт үүсгэсэн: {date(p.created_at)} · {fmt(p.amount)} · {p.months} сар</p>
      </>
    )
  } else {
    const rejected = st.last?.status === 'rejected' ? st.last : null
    body = (
      <>
        <div style={s.title}>PrintCalc Pro</div>
        <div style={s.sub}>Тооцоолуур үнэгүй. Үнийн санал гаргаж, PDF-ээр татах, и-мэйлээр илгээх нь Pro эрхтэй.</div>
        {rejected && (
          <div style={s.err}>Өмнөх төлбөрийн хүсэлт ({rejected.ref_code}) батлагдаагүй.{rejected.note ? ` Шалтгаан: ${rejected.note}` : ''}</div>
        )}
        {!st.ready && <div style={s.warn}>Төлбөр хүлээн авах тохиргоо хийгдээгүй байна. Түр хүлээгээд дахин оролдоно уу.</div>}
        {err && <div style={s.err}>{err}</div>}
        <div style={s.card}>
          <div style={s.price}>
            <span style={{ fontSize:13, color:'#64748b' }}>{st.months} сарын эрх</span>
            <span style={{ fontSize:26, fontWeight:800, color:'#4f46e5' }}>{fmt(st.price)}</span>
          </div>
          {FEATURES.map(f => (
            <div key={f} style={s.feat}><span style={{ color:'#10b981', fontWeight:700 }}>✓</span>{f}</div>
          ))}
        </div>
        <button style={{ ...s.btn, opacity: busy || !st.ready ? .6 : 1 }} onClick={createRequest} disabled={busy || !st.ready}>
          {busy ? 'Түр хүлээнэ үү...' : 'Дансаар төлөх'}
        </button>
      </>
    )
  }

  return (
    <div style={s.overlay} onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div style={s.box}>
        <button style={s.close} onClick={onClose} aria-label="Хаах">×</button>
        {body}
      </div>
    </div>
  )
}
