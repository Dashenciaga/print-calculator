'use client'
import { useState } from 'react'

const QTYS = [100, 200, 300, 400, 500]
const VAT = 0.10

export default function QuoteModal({ onClose, calcData, profile }) {
  const [clientName, setClientName] = useState('')
  const [clientContact, setClientContact] = useState('')

  const {
    baseCost = 0,
    profitPct = 30,
    qty = 100,
    printSheet = 'B3',
    prodW = 0,
    prodH = 0,
    sides = 1,
    process = 'Огтлоо',
    productName = 'Хэвлэл',
  } = calcData || {}

  function getPrice(q) {
    const scale = Math.pow(q / (qty || 100), 0.82)
    const cost = baseCost * scale
    const withProfit = cost * (1 + profitPct / 100)
    const total = Math.round(withProfit)
    const unit = Math.round(total / q)
    const vat = Math.round(total * VAT)
    const vatTotal = total + vat
    return { q, unit, total, vat, vatTotal }
  }

  const main = getPrice(qty)
  const rows = QTYS.map(q => getPrice(q))
  const fmt = n => '₮' + Math.round(n).toLocaleString()
  const today = new Date().toLocaleDateString('mn-MN')
  const quoteNum = '#QT-' + Date.now().toString().slice(-6)

  const s = {
    overlay: { position:'fixed', inset:0, background:'rgba(0,0,0,.45)', zIndex:100, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'20px', overflowY:'auto' },
    modal: { background:'white', borderRadius:12, border:'0.5px solid #e2e8f0', width:'100%', maxWidth:640, fontFamily:'system-ui,-apple-system,sans-serif', marginTop:20 },
    top: { padding:'11px 16px', borderBottom:'0.5px solid #e2e8f0', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:20, background:'white', zIndex:2, borderRadius:'12px 12px 0 0' },
    topTitle: { fontSize:13, fontWeight:500, color:'#1a1f36' },
    actions: { display:'flex', gap:6 },
    btnOut: { padding:'5px 11px', fontSize:11, border:'0.5px solid #e2e8f0', borderRadius:8, background:'none', color:'#64748b', cursor:'pointer' },
    btnPri: { padding:'5px 13px', fontSize:11, border:'none', borderRadius:8, background:'#4f46e5', color:'white', cursor:'pointer', fontWeight:500 },
    qp: { padding:'22px 26px' },
    hdr: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16, paddingBottom:14, borderBottom:'0.5px solid #e2e8f0' },
    logoRow: { display:'flex', alignItems:'center', gap:8 },
    logoIcon: { width:26, height:26, background:'#4f46e5', borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
    coName: { fontSize:12, fontWeight:500, color:'#1a1f36' },
    coInfo: { fontSize:10, color:'#64748b', lineHeight:1.6, marginTop:2 },
    metaTitle: { fontSize:14, fontWeight:500, color:'#1a1f36', textAlign:'right', marginBottom:2 },
    metaSub: { fontSize:10, color:'#64748b', textAlign:'right', lineHeight:1.6 },
    parties: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 },
    party: { background:'#f8f9fb', borderRadius:8, padding:'9px 11px', border:'0.5px solid #e2e8f0' },
    partyLbl: { fontSize:9, fontWeight:500, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:5 },
    partyName: { fontSize:11, fontWeight:500, color:'#1a1f36', marginBottom:1 },
    partyDetail: { fontSize:10, color:'#64748b', lineHeight:1.5 },
    input: { width:'100%', padding:'4px 7px', fontSize:11, border:'0.5px solid #e2e8f0', borderRadius:6, background:'white', color:'#1a1f36', outline:'none', marginBottom:4, boxSizing:'border-box' },
    sec: { fontSize:9, fontWeight:500, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:6 },
    tbl: { width:'100%', borderCollapse:'collapse', fontSize:11, marginBottom:12 },
    thL: { textAlign:'left', padding:'5px 7px', background:'#f8f9fb', color:'#64748b', fontWeight:500, borderBottom:'0.5px solid #e2e8f0', fontSize:10 },
    thR: { textAlign:'right', padding:'5px 7px', background:'#f8f9fb', color:'#64748b', fontWeight:500, borderBottom:'0.5px solid #e2e8f0', fontSize:10 },
    tdL: { padding:'8px 7px', verticalAlign:'top' },
    tdR: { padding:'8px 7px', textAlign:'right', whiteSpace:'nowrap', color:'#374151' },
    tdMain: { fontSize:11, fontWeight:500, color:'#1a1f36' },
    tdSub: { fontSize:10, color:'#94a3b8', marginTop:2, lineHeight:1.5 },
    qtyTdL: (cur) => ({ padding:'5px 7px', textAlign:'left', fontWeight:500, color: cur?'#4f46e5':'#1a1f36', background: cur?'#f5f3ff':'transparent', fontSize:11, borderBottom:'0.5px solid #f1f5f9' }),
    qtyTdR: (cur) => ({ padding:'5px 7px', textAlign:'right', color: cur?'#4f46e5':'#374151', background: cur?'#f5f3ff':'transparent', fontSize:11, borderBottom:'0.5px solid #f1f5f9', whiteSpace:'nowrap' }),
    bankBox: { background:'#f8f9fb', borderRadius:8, padding:'9px 11px', border:'0.5px solid #e2e8f0', marginBottom:12 },
    bankGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:5, marginTop:5 },
    bankLbl: { fontSize:10, color:'#94a3b8', marginBottom:1 },
    bankVal: { fontSize:10, color:'#1a1f36', fontWeight:500 },
    footer: { borderTop:'0.5px solid #e2e8f0', paddingTop:10, display:'flex', justifyContent:'space-between', alignItems:'center' },
    note: { fontSize:10, color:'#94a3b8', lineHeight:1.5 },
    wm: { display:'flex', alignItems:'center', gap:4, opacity:.3 },
    wmIcon: { width:13, height:13, background:'#4f46e5', borderRadius:3, display:'flex', alignItems:'center', justifyContent:'center' },
    wmName: { fontSize:9, fontWeight:500, color:'#1a1f36' },
  }

  function handlePrint() {
    window.print()
  }

  const coName = profile?.company_name || 'Компанийн нэр'
  const coPhone = profile?.phone || ''
  const coEmail = profile?.contact_email || profile?.email || ''
  const coAddress = profile?.address || ''
  const coReg = profile?.register_number || ''
  const coBank = profile?.bank_name || ''
  const coAccount = profile?.bank_account || ''

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={e => e.stopPropagation()}>
        <div style={s.top}>
          <span style={s.topTitle}>Үнийн санал үүсгэх</span>
          <div style={s.actions}>
            <button style={s.btnOut} onClick={onClose}>✕ Хаах</button>
            <button style={s.btnOut} onClick={handlePrint}>🖨 Хэвлэх</button>
            <button style={s.btnPri}>⬇ PDF татах</button>
          </div>
        </div>

        <div style={s.qp} id="quotePrintArea">
          {/* HEADER */}
          <div style={s.hdr}>
            <div>
              <div style={s.logoRow}>
                <div style={s.logoIcon}>
                  <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 7h8M8 12h5"/></svg>
                </div>
                <div style={s.coName}>{coName}</div>
              </div>
              <div style={s.coInfo}>
                {coAddress && <>{coAddress}<br/></>}
                {coReg && <>Регистр: {coReg} · </>}{coPhone && <>Утас: {coPhone}</>}<br/>
                {coEmail && <>{coEmail} · </>}{coBank && <>{coBank} {coAccount}</>}
              </div>
            </div>
            <div>
              <div style={s.metaTitle}>Үнийн санал</div>
              <div style={s.metaSub}>{quoteNum}<br/>{today}</div>
            </div>
          </div>

          {/* PARTIES */}
          <div style={s.parties}>
            <div style={s.party}>
              <div style={s.partyLbl}>Илгээгч</div>
              <div style={s.partyName}>{coName}</div>
              <div style={s.partyDetail}>{coEmail}<br/>{coPhone}</div>
            </div>
            <div style={s.party}>
              <div style={s.partyLbl}>Хүлээн авагч</div>
              <input style={s.input} type="text" placeholder="Компанийн нэр..." value={clientName} onChange={e=>setClientName(e.target.value)}/>
              <input style={s.input} type="text" placeholder="И-мэйл / утас..." value={clientContact} onChange={e=>setClientContact(e.target.value)}/>
            </div>
          </div>

          {/* ХЭВЛЭЛИЙН МЭДЭЭЛЭЛ */}
          <div style={s.sec}>Хэвлэлийн мэдээлэл</div>
          <table style={s.tbl}>
            <thead>
              <tr>
                <th style={s.thL}>Бүтээгдэхүүн · тайлбар</th>
                <th style={s.thR}>Тоо</th>
                <th style={s.thR}>Нэгж үнэ</th>
                <th style={s.thR}>Дүн</th>
                <th style={s.thR}>НӨАТ 10%</th>
                <th style={s.thR}>Нийт дүн</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={s.tdL}>
                  <div style={s.tdMain}>{productName}</div>
                  <div style={s.tdSub}>
                    {prodW}×{prodH}мм ({printSheet}) · {sides===1?'Нэг тал':'Хоёр тал'} · Офсет<br/>
                    Боловсруулалт: {process}
                  </div>
                </td>
                <td style={s.tdR}>{qty.toLocaleString()} ш</td>
                <td style={s.tdR}>{fmt(main.unit)}</td>
                <td style={s.tdR}>{fmt(main.total)}</td>
                <td style={s.tdR}>{fmt(main.vat)}</td>
                <td style={s.tdR}><strong>{fmt(main.vatTotal)}</strong></td>
              </tr>
            </tbody>
          </table>

          {/* ТООНЫ ХҮСНЭГТ */}
          <div style={s.sec}>Тооны үнийн хүснэгт</div>
          <table style={s.tbl}>
            <thead>
              <tr>
                <th style={s.thL}>Тоо (ш)</th>
                <th style={s.thR}>Нэгж үнэ</th>
                <th style={s.thR}>Дүн</th>
                <th style={s.thR}>НӨАТ 10%</th>
                <th style={s.thR}>Нийт дүн</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const cur = r.q === qty
                return (
                  <tr key={r.q}>
                    <td style={s.qtyTdL(cur)}>{cur ? '▶ ' : ''}{r.q.toLocaleString()} ш</td>
                    <td style={s.qtyTdR(cur)}>{fmt(r.unit)}</td>
                    <td style={s.qtyTdR(cur)}>{fmt(r.total)}</td>
                    <td style={s.qtyTdR(cur)}>{fmt(r.vat)}</td>
                    <td style={{...s.qtyTdR(cur), fontWeight: cur?700:400}}>{fmt(r.vatTotal)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* БАНК */}
          <div style={s.bankBox}>
            <div style={s.sec}>Төлбөрийн мэдээлэл</div>
            <div style={s.bankGrid}>
              <div><div style={s.bankLbl}>Банк</div><div style={s.bankVal}>{coBank || '—'}</div></div>
              <div><div style={s.bankLbl}>Дансны дугаар</div><div style={s.bankVal}>{coAccount || '—'}</div></div>
              <div><div style={s.bankLbl}>Данс эзэмшигч</div><div style={s.bankVal}>{coName}</div></div>
              <div><div style={s.bankLbl}>Хүчинтэй хугацаа</div><div style={s.bankVal}>14 хоног</div></div>
            </div>
          </div>

          {/* FOOTER */}
          <div style={s.footer}>
            <div style={s.note}>
              Энэхүү үнийн санал 14 хоногийн дотор хүчинтэй.<br/>
              {coEmail && <>Асуулт байвал: {coEmail}</>}
            </div>
            <div style={s.wm}>
              <div style={s.wmIcon}><svg width="7" height="7" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2"><rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 7h8M8 12h5"/></svg></div>
              <span style={s.wmName}>PrintCalc Pro</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}