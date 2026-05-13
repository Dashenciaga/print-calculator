'use client'
import { useState, useEffect, useRef } from 'react'

export default function PaymentModal({ onClose, onSuccess }) {
  const [step, setStep]     = useState('idle') // idle | loading | qr | paid | error
  const [invoice, setInvoice] = useState(null)
  const [errMsg, setErrMsg]   = useState('')
  const pollRef = useRef(null)

  useEffect(() => () => clearInterval(pollRef.current), [])

  async function createInvoice() {
    setStep('loading')
    setErrMsg('')
    try {
      const r = await fetch('/api/qpay/invoice', { method: 'POST' })
      const data = await r.json()
      if (data.error) { setErrMsg(data.error); setStep('error'); return }
      setInvoice(data)
      setStep('qr')
      pollRef.current = setInterval(async () => {
        try {
          const cr = await fetch('/api/qpay/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ invoice_id: data.invoice_id }),
          })
          const cd = await cr.json()
          if (cd.paid) {
            clearInterval(pollRef.current)
            setStep('paid')
            setTimeout(() => { onSuccess?.(); onClose?.() }, 2200)
          }
        } catch {}
      }, 3000)
    } catch (e) {
      setErrMsg(e.message)
      setStep('error')
    }
  }

  return (
    <div
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:300,
        display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={e => e.target === e.currentTarget && step !== 'loading' && onClose?.()}
    >
      <div style={{ background:'#fff', borderRadius:18, padding:28, width:420, maxWidth:'100%',
        boxShadow:'0 28px 80px rgba(0,0,0,0.22)', position:'relative' }}>

        {step !== 'loading' && step !== 'paid' && (
          <button onClick={onClose} style={{ position:'absolute', top:14, right:16,
            background:'none', border:'none', cursor:'pointer', color:'#9aa5bf',
            fontSize:22, lineHeight:1, padding:4 }}>×</button>
        )}

        {/* ── IDLE ── */}
        {step === 'idle' && (
          <>
            <div style={{ textAlign:'center', marginBottom:22 }}>
              <div style={{ fontSize:36, marginBottom:10 }}>⭐</div>
              <div style={{ fontSize:20, fontWeight:800, color:'#111827' }}>PrintCalc Pro</div>
              <div style={{ fontSize:13, color:'#4b5a7a', marginTop:4 }}>Жилийн эрх — нэг удаа төлнө</div>
            </div>

            <div style={{ background:'#f4f6fb', borderRadius:12, padding:'16px 18px', marginBottom:22 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14,
                paddingBottom:14, borderBottom:'1px solid #e2e8f3' }}>
                <span style={{ fontSize:13, color:'#4b5a7a', fontWeight:500 }}>Жилийн үнэ</span>
                <span style={{ fontSize:28, fontWeight:800, color:'#4f7cff', letterSpacing:'-1px' }}>₮199,000</span>
              </div>
              {[
                'Хязгааргүй тооцоо хадгалах',
                'Автомат зардал тооцоо',
                'PDF үнийн санал үүсгэх',
                'Байршуулалтын визуал зураг',
                'Нарийвчилсан зардлын задаргаа',
                'Хэвлэх арга, цаас, өнгөний тохиргоо',
              ].map(f => (
                <div key={f} style={{ display:'flex', alignItems:'center', gap:8,
                  padding:'5px 0', fontSize:13, color:'#111827' }}>
                  <span style={{ color:'#10b981', fontWeight:700, fontSize:14 }}>✓</span>{f}
                </div>
              ))}
            </div>

            <button onClick={createInvoice} style={{ width:'100%', padding:'14px',
              background:'#4f7cff', color:'white', border:'none', borderRadius:10,
              fontSize:14, fontWeight:700, cursor:'pointer',
              boxShadow:'0 4px 20px rgba(79,124,255,0.35)', letterSpacing:'-.2px' }}>
              QPay-р төлөх
            </button>
          </>
        )}

        {/* ── LOADING ── */}
        {step === 'loading' && (
          <div style={{ textAlign:'center', padding:'48px 0' }}>
            <div style={{ fontSize:36, marginBottom:14 }}>⏳</div>
            <div style={{ fontSize:14, color:'#4b5a7a', fontWeight:500 }}>Нэхэмжлэл үүсгэж байна...</div>
          </div>
        )}

        {/* ── QR ── */}
        {step === 'qr' && invoice && (
          <>
            <div style={{ fontSize:16, fontWeight:800, color:'#111827', marginBottom:4 }}>QPay төлбөр</div>
            <div style={{ fontSize:12, color:'#4b5a7a', marginBottom:18 }}>
              QR кодыг уншуулах эсвэл банкны аппаа нээнэ үү
            </div>

            {invoice.qr_image && (
              <div style={{ textAlign:'center', marginBottom:18 }}>
                <img
                  src={`data:image/png;base64,${invoice.qr_image}`}
                  alt="QR"
                  style={{ width:200, height:200, border:'1px solid #e2e8f3', borderRadius:10 }}
                />
              </div>
            )}

            {invoice.urls?.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:18 }}>
                {invoice.urls.slice(0, 8).map((u, i) => (
                  <a key={i} href={u.link} target="_blank" rel="noopener noreferrer"
                    style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 10px',
                      border:'1.5px solid #e2e8f3', borderRadius:8, textDecoration:'none',
                      color:'#111827', fontSize:12, fontWeight:500, background:'#fff' }}>
                    {u.logo
                      ? <img src={u.logo} alt="" style={{ width:22, height:22, borderRadius:4, objectFit:'contain' }}/>
                      : <span style={{ fontSize:18 }}>🏦</span>}
                    <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {u.name || u.description}
                    </span>
                  </a>
                ))}
              </div>
            )}

            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px',
              background:'#f0fdf4', borderRadius:9, border:'1px solid #bbf7d0',
              fontSize:12, color:'#166534' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#10b981',
                display:'inline-block', flexShrink:0,
                animation:'pulse 1.5s ease-in-out infinite' }}/>
              Төлбөр баталгаажихыг хүлээж байна...
            </div>
            <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
          </>
        )}

        {/* ── PAID ── */}
        {step === 'paid' && (
          <div style={{ textAlign:'center', padding:'44px 0' }}>
            <div style={{ fontSize:52, marginBottom:14 }}>🎉</div>
            <div style={{ fontSize:20, fontWeight:800, color:'#111827', marginBottom:8 }}>Амжилттай!</div>
            <div style={{ fontSize:14, color:'#10b981', fontWeight:600 }}>Pro эрх идэвхжлээ. Баярлалаа!</div>
          </div>
        )}

        {/* ── ERROR ── */}
        {step === 'error' && (
          <div style={{ textAlign:'center', padding:'24px 0' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>⚠️</div>
            <div style={{ fontSize:15, fontWeight:700, color:'#111827', marginBottom:6 }}>Алдаа гарлаа</div>
            <div style={{ fontSize:12, color:'#ef4444', marginBottom:20, lineHeight:1.6 }}>{errMsg}</div>
            <button onClick={createInvoice} style={{ padding:'10px 28px', background:'#4f7cff',
              color:'white', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer' }}>
              Дахин оролдох
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
