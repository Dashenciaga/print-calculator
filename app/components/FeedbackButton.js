'use client'
import { useState } from 'react'

export default function FeedbackButton() {
  const [open, setOpen]       = useState(false)
  const [rating, setRating]   = useState(0)
  const [hovered, setHovered] = useState(0)
  const [message, setMessage] = useState('')
  const [step, setStep]       = useState('form') // form | sending | done | error
  const [errMsg, setErrMsg]   = useState('')

  async function submit() {
    if (!message.trim()) return
    setStep('sending')
    try {
      const r = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, rating }),
      })
      const d = await r.json()
      if (d.error) { setErrMsg(d.error); setStep('error') }
      else setStep('done')
    } catch (e) {
      setErrMsg(e.message)
      setStep('error')
    }
  }

  function handleClose() {
    setOpen(false)
    setTimeout(() => { setStep('form'); setMessage(''); setRating(0); setErrMsg('') }, 300)
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        title="Санал хүсэлт"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 100,
          width: 48, height: 48, borderRadius: '50%',
          background: 'linear-gradient(135deg,#4f7cff,#7c3aed)',
          border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(79,124,255,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform .15s, box-shadow .15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform='scale(1.1)'; e.currentTarget.style.boxShadow='0 6px 28px rgba(79,124,255,0.55)' }}
        onMouseLeave={e => { e.currentTarget.style.transform='scale(1)'; e.currentTarget.style.boxShadow='0 4px 20px rgba(79,124,255,0.4)' }}
      >
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>

      {/* Modal */}
      {open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
            padding: '0 24px 88px' }}
          onClick={e => e.target === e.currentTarget && handleClose()}
        >
          <div style={{ background: '#fff', borderRadius: 16, width: 320,
            boxShadow: '0 20px 60px rgba(0,0,0,0.18)', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ padding: '16px 18px 14px', borderBottom: '1px solid #e2e8f3',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#111827' }}>Санал хүсэлт</div>
                <div style={{ fontSize: 11, color: '#4b5a7a', marginTop: 2 }}>Таны санал бидэнд чухал</div>
              </div>
              <button onClick={handleClose} style={{ background: 'none', border: 'none',
                cursor: 'pointer', color: '#9aa5bf', fontSize: 20, lineHeight: 1, padding: 4 }}>×</button>
            </div>

            <div style={{ padding: '16px 18px 18px' }}>

              {step === 'form' && (
                <>
                  {/* Star rating */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#4b5a7a',
                      textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
                      Үнэлгээ
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {[1,2,3,4,5].map(n => (
                        <button key={n}
                          onClick={() => setRating(n)}
                          onMouseEnter={() => setHovered(n)}
                          onMouseLeave={() => setHovered(0)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 26, padding: '0 2px', lineHeight: 1, transition: 'transform .1s',
                            transform: hovered >= n || rating >= n ? 'scale(1.15)' : 'scale(1)' }}>
                          {hovered >= n || rating >= n ? '⭐' : '☆'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#4b5a7a',
                      textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
                      Санал, хүсэлт
                    </div>
                    <textarea
                      autoFocus
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="Ямар боломж нэмэх хэрэгтэй вэ? Ямар асуудал тулгарав?"
                      rows={4}
                      style={{ width: '100%', padding: '9px 11px', fontSize: 13, border: '1.5px solid #e2e8f3',
                        borderRadius: 8, background: '#fff', color: '#111827', resize: 'vertical',
                        outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.5 }}
                      onFocus={e => e.target.style.borderColor='#4f7cff'}
                      onBlur={e => e.target.style.borderColor='#e2e8f3'}
                    />
                  </div>

                  <button
                    onClick={submit}
                    disabled={!message.trim()}
                    style={{ width: '100%', padding: '11px', background: '#4f7cff', color: 'white',
                      border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                      opacity: message.trim() ? 1 : 0.5,
                      boxShadow: message.trim() ? '0 4px 16px rgba(79,124,255,0.3)' : 'none' }}>
                    Илгээх
                  </button>
                </>
              )}

              {step === 'sending' && (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#4b5a7a', fontSize: 13 }}>
                  Илгээж байна...
                </div>
              )}

              {step === 'done' && (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>🙏</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 6 }}>Баярлалаа!</div>
                  <div style={{ fontSize: 13, color: '#4b5a7a', marginBottom: 16 }}>Таны санал хүлээн авлаа</div>
                  <button onClick={handleClose} style={{ padding: '9px 24px', background: '#4f7cff',
                    color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Хаах
                  </button>
                </div>
              )}

              {step === 'error' && (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: 13, color: '#ef4444', marginBottom: 14 }}>{errMsg}</div>
                  <button onClick={() => setStep('form')} style={{ padding: '8px 20px', background: '#4f7cff',
                    color: 'white', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                    Дахин оролдох
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  )
}
