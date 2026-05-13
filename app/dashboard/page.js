'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const PAPER_SIZES = {
  A4: [210, 297], A3: [297, 420], A5: [148, 210],
  Letter: [216, 279], Legal: [216, 356]
}

const S = {
  shell: { display:'flex', minHeight:'100vh', background:'#f4f5f7', fontFamily:'system-ui,-apple-system,sans-serif' },
  sidebar: { width:220, background:'#1a1f36', display:'flex', flexDirection:'column', flexShrink:0, position:'fixed', top:0, left:0, bottom:0, zIndex:10 },
  sbLogo: { display:'flex', alignItems:'center', gap:10, padding:'20px 18px 24px' },
  sbIcon: { width:30, height:30, background:'#4f46e5', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 },
  sbName: { color:'white', fontSize:14, fontWeight:600, letterSpacing:'-.2px' },
  sbSection: { fontSize:10, color:'#475569', fontWeight:600, letterSpacing:'.08em', textTransform:'uppercase', padding:'0 18px 8px' },
  sbItem: { display:'flex', alignItems:'center', gap:9, padding:'9px 18px', fontSize:13, color:'#94a3b8', cursor:'pointer', border:'none', background:'none', width:'100%', textAlign:'left', transition:'color .15s' },
  sbItemActive: { background:'#2d3555', color:'white' },
  sbSpacer: { flex:1 },
  sbUser: { display:'flex', alignItems:'center', gap:9, padding:'14px 18px', borderTop:'0.5px solid #2d3555' },
  sbAvatar: { width:30, height:30, borderRadius:'50%', background:'#4f46e5', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:11, fontWeight:600, flexShrink:0 },
  sbUname: { color:'#cbd5e1', fontSize:12, fontWeight:500 },
  sbEmail: { color:'#475569', fontSize:10 },
  main: { flex:1, marginLeft:220, display:'flex', flexDirection:'column', minHeight:'100vh' },
  topbar: { background:'white', borderBottom:'0.5px solid #e2e8f0', padding:'0 24px', height:52, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:5 },
  tbTitle: { fontSize:15, fontWeight:600, color:'#1a1f36' },
  tbRight: { display:'flex', alignItems:'center', gap:10 },
  tabWrap: { display:'flex', gap:2, background:'#f1f5f9', borderRadius:7, padding:3 },
  tab: { padding:'5px 16px', fontSize:12, borderRadius:5, color:'#64748b', cursor:'pointer', border:'none', background:'none', fontWeight:500, transition:'all .15s' },
  tabActive: { background:'white', color:'#1a1f36', fontWeight:600, boxShadow:'0 1px 3px rgba(0,0,0,.08)' },
  content: { padding:'20px 24px', flex:1 },
  metricsGrid: { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 },
  metricCard: { background:'white', borderRadius:10, border:'0.5px solid #e2e8f0', padding:'14px 16px' },
  mcLabel: { fontSize:11, color:'#64748b', marginBottom:6, fontWeight:500 },
  mcVal: { fontSize:24, fontWeight:700, color:'#1a1f36', letterSpacing:'-.5px' },
  mcUnit: { fontSize:11, color:'#94a3b8', marginLeft:2 },
  mcSub: { fontSize:11, color:'#10b981', marginTop:3 },
  twoCol: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 },
  card: { background:'white', borderRadius:10, border:'0.5px solid #e2e8f0', padding:'16px' },
  cardTitle: { fontSize:13, fontWeight:600, color:'#1a1f36', marginBottom:14 },
  paperVis: { background:'#f8f9fb', borderRadius:8, border:'0.5px solid #e2e8f0', padding:12, display:'flex', flexDirection:'column', alignItems:'center', gap:8, minHeight:160 },
  visLabel: { fontSize:11, color:'#94a3b8' },
  fieldRow: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 },
  fieldLabel: { display:'block', fontSize:11, fontWeight:500, color:'#374151', marginBottom:4 },
  fieldInput: { width:'100%', padding:'8px 10px', fontSize:13, border:'1.5px solid #e2e8f0', borderRadius:8, background:'white', color:'#1a1f36', outline:'none', boxSizing:'border-box' },
  orientWrap: { display:'flex', background:'#f1f5f9', borderRadius:8, overflow:'hidden', border:'1.5px solid #e2e8f0' },
  orientBtn: { flex:1, padding:'8px', fontSize:12, fontWeight:500, border:'none', background:'none', color:'#64748b', cursor:'pointer' },
  orientBtnActive: { background:'#4f46e5', color:'white' },
  brRow: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'0.5px solid #f1f5f9', fontSize:13 },
  brLabel: { color:'#64748b' },
  brVal: { color:'#1a1f36', fontWeight:500 },
  brTotal: { display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f5f3ff', borderRadius:8, padding:'10px 12px', marginTop:8 },
  brTL: { fontSize:13, color:'#4f46e5', fontWeight:600 },
  brTV: { fontSize:18, color:'#4f46e5', fontWeight:700 },
  saveBtn: { width:'100%', padding:'10px', background:'#4f46e5', color:'white', border:'none', borderRadius:8, fontSize:13, fontWeight:600, cursor:'pointer', marginTop:12 },
  calcBtn: { width:'100%', padding:'11px', background:'#4f46e5', color:'white', border:'none', borderRadius:9, fontSize:14, fontWeight:600, cursor:'pointer', marginTop:8 },
  histItem: { background:'white', border:'0.5px solid #e2e8f0', borderRadius:10, padding:'12px 14px', marginBottom:8 },
  histTop: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 },
  histName: { fontSize:13, fontWeight:600, color:'#1a1f36' },
  histAmt: { fontSize:14, fontWeight:700, color:'#4f46e5' },
  histTags: { display:'flex', gap:6, flexWrap:'wrap' },
  tag: { fontSize:11, color:'#64748b', background:'#f1f5f9', padding:'2px 8px', borderRadius:20 },
  empty: { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 20px', gap:12, color:'#94a3b8', textAlign:'center' },
  sectionSelect: { width:'100%', padding:'8px 10px', fontSize:13, border:'1.5px solid #e2e8f0', borderRadius:8, background:'white', color:'#1a1f36', outline:'none', boxSizing:'border-box' },
}

function PaperVis({ cols, rows, pW, pH, mW, mH, gap, margin }) {
  const maxW = 180, maxH = 130
  // BUG FIX 1: pW/pH 0 байвал scale тооцооллоос хамгаалах (division by zero)
  if (!pW || !pH) return null
  const scale = Math.min(maxW / pW, maxH / pH, 1)
  const vw = Math.round(pW * scale), vh = Math.round(pH * scale)
  const smrg = Math.round(margin * scale)
  const smW = Math.max(1, Math.round(mW * scale))
  const smH = Math.max(1, Math.round(mH * scale))
  const sgap = Math.round(gap * scale)
  const items = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      items.push({ x: smrg + c*(smW+sgap), y: smrg + r*(smH+sgap), n: r*cols+c+1 })
  return (
    <div style={{position:'relative', background:'white', border:'1px solid #c7d2fe', borderRadius:4, flexShrink:0, width:vw, height:vh}}>
      {items.map(({x,y,n}) => (
        <div key={n} style={{position:'absolute', left:x, top:y, width:smW, height:smH, background:'#eef2ff', border:'0.5px solid #a5b4fc', borderRadius:2, display:'flex', alignItems:'center', justifyContent:'center', fontSize:Math.max(6,Math.min(9,smW/3)), color:'#4f46e5', fontWeight:600}}>
          {smW > 10 && smH > 8 ? n : ''}
        </div>
      ))}
    </div>
  )
}

// BUG FIX 2: Input утгыг зөв parse хийх helper — '0' оруулахад 0 буцаах, NaN-ийг 0 болгох
function parseNum(val) {
  const n = parseFloat(val)
  return isNaN(n) ? 0 : n
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [orient, setOrient] = useState('portrait')
  const [paperSize, setPaperSize] = useState('A4')
  const [pW, setPW] = useState(210)
  const [pH, setPH] = useState(297)
  const [mW, setMW] = useState(90)
  const [mH, setMH] = useState(55)
  const [gap, setGap] = useState(3)
  const [margin, setMargin] = useState(5)
  const [qty, setQty] = useState(1000)
  const [setupCost, setSetupCost] = useState(50000)
  const [printCost, setPrintCost] = useState(80)
  const [overhead, setOverhead] = useState(15)
  const [vat, setVat] = useState(10)
  const [history, setHistory] = useState([])
  const [activeTab, setActiveTab] = useState('calc')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  // BUG FIX 3: loadHistory-г useCallback болгох — dependency array-д аюулгүй дамжуулна
  const loadHistory = useCallback(async (uid) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('calculations')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setHistory(data)
  }, [])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const { data: prof } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()
      setProfile(prof)
      loadHistory(user.id)
    }
    init()
  // BUG FIX 4: dependency array-д loadHistory нэмэх (router нь Next.js-д stable тул зөв)
  }, [loadHistory, router])

  useEffect(() => {
    // BUG FIX 5: paperSize 'custom' биш ч PAPER_SIZES-д байхгүй утга ирвэл crash болохгүй байх
    if (paperSize !== 'custom' && PAPER_SIZES[paperSize]) {
      let [w, h] = PAPER_SIZES[paperSize]
      if (orient === 'landscape') [w, h] = [h, w]
      setPW(w); setPH(h)
    }
  }, [paperSize, orient])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  const usableW = pW - 2*margin, usableH = pH - 2*margin
  const cols = mW > 0 ? Math.max(0, Math.floor((usableW+gap)/(mW+gap))) : 0
  const rows = mH > 0 ? Math.max(0, Math.floor((usableH+gap)/(mH+gap))) : 0
  const perSheet = cols * rows
  const sheetsNeeded = perSheet > 0 ? Math.ceil(qty/perSheet) : 0
  const efficiency = sheetsNeeded*perSheet > 0 ? (qty/(sheetsNeeded*perSheet)*100) : 0
  const printBase = sheetsNeeded*printCost + setupCost
  const overheadAmt = printBase*(overhead/100)
  const subtotal = printBase + overheadAmt
  const vatAmt = subtotal*(vat/100)
  const total = subtotal + vatAmt
  const unitCost = qty > 0 ? total/qty : 0

  // BUG FIX 6: saveCalc-д try/finally ашиглах — error гарсан ч setSaving(false) заавал дуусна
  async function saveCalc() {
    if (!user) return
    setSaving(true)
    try {
      const supabase = createClient()
      await supabase.from('calculations').insert({
        user_id: user.id,
        paper_size: paperSize,
        paper_w: pW,
        paper_h: pH,
        material_w: mW,
        material_h: mH,
        qty,
        total: Math.round(total),
        per_sheet: perSheet,
        efficiency: Math.round(efficiency*10)/10
      })
      await loadHistory(user.id)
      setActiveTab('history')
    } finally {
      // Error гарсан ч гарахгүй ч энэ заавал ажиллана
      setSaving(false)
    }
  }

  const fmt = n => Math.round(n).toLocaleString()
  const initials = (profile?.company_name || user?.email || '?').slice(0,2).toUpperCase()

  if (!user) return (
    <div style={{minHeight:'100vh',background:'#f4f5f7',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748b'}}>
      Ачааллаж байна...
    </div>
  )

  return (
    <div style={S.shell}>
      {/* SIDEBAR */}
      <div style={S.sidebar}>
        <div style={S.sbLogo}>
          <div style={S.sbIcon}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
              <rect x="2" y="3" width="20" height="18" rx="2"/>
              <path d="M8 7h8M8 12h5"/>
            </svg>
          </div>
          <span style={S.sbName}>PrintCalc Pro</span>
        </div>
        <div style={S.sbSection}>Үндсэн</div>
        {[
          {id:'calc', label:'Тооцоо', icon:<path d="M9 7h6M9 12h6M9 17h4"/>},
          {id:'result', label:'Үр дүн', icon:<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>},
          {id:'history', label:'Түүх', icon:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>},
        ].map(t => (
          <button key={t.id} style={{...S.sbItem, ...(activeTab===t.id ? S.sbItemActive : {})}} onClick={()=>setActiveTab(t.id)}>
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">{t.icon}</svg>
            {t.label}
          </button>
        ))}
        <div style={{height:16}}/>
        <div style={S.sbSection}>Тохиргоо</div>
        <button style={S.sbItem} onClick={()=>router.push('/profile')}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          Профайл
        </button>
        <div style={{margin:'12px 12px 8px'}}>
          <button onClick={()=>router.push('/dashboard/pro')} style={{width:'100%',padding:'9px 12px',background:'linear-gradient(135deg,#4f46e5,#7c3aed)',border:'none',borderRadius:8,color:'white',fontSize:12,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',gap:7}}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Pro хувилбар харах
          </button>
        </div>
        <div style={S.sbSpacer}/>
        <div style={S.sbUser}>
          <div style={S.sbAvatar}>
            {profile?.logo_url
              ? <img src={profile.logo_url} alt="logo" style={{width:30,height:30,borderRadius:'50%',objectFit:'cover'}}/>
              : initials}
          </div>
          <div>
            <div style={S.sbUname}>{profile?.company_name || 'Компани'}</div>
            <div style={S.sbEmail}>{user.email?.slice(0,22)}</div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={S.main}>
        <div style={S.topbar}>
          <span style={S.tbTitle}>Хэвлэлийн тооцоо</span>
          <div style={S.tbRight}>
            <div style={S.tabWrap}>
              {['calc','result','history'].map(t => (
                <button key={t} style={{...S.tab, ...(activeTab===t ? S.tabActive : {})}} onClick={()=>setActiveTab(t)}>
                  {t==='calc'?'Тооцоо':t==='result'?'Үр дүн':'Түүх'}
                </button>
              ))}
            </div>
            <button onClick={handleLogout} style={{padding:'6px 14px', background:'transparent', border:'0.5px solid #e2e8f0', borderRadius:7, fontSize:12, color:'#64748b', cursor:'pointer'}}>
              Гарах
            </button>
          </div>
        </div>

        <div style={S.content}>
          {/* CALC TAB */}
          {activeTab === 'calc' && (
            <div style={{maxWidth:680}}>
              <div style={S.card}>
                <div style={S.cardTitle}>Цаасны хэмжээ</div>
                <div style={S.fieldRow}>
                  <div>
                    <label style={S.fieldLabel}>Стандарт</label>
                    <select style={S.sectionSelect} value={paperSize} onChange={e=>setPaperSize(e.target.value)}>
                      {Object.keys(PAPER_SIZES).map(s=><option key={s} value={s}>{s}</option>)}
                      <option value="custom">Дурын</option>
                    </select>
                  </div>
                  <div>
                    <label style={S.fieldLabel}>Чиглэл</label>
                    <div style={S.orientWrap}>
                      <button style={{...S.orientBtn,...(orient==='portrait'?S.orientBtnActive:{})}} onClick={()=>setOrient('portrait')}>↕ Босоо</button>
                      <button style={{...S.orientBtn,...(orient==='landscape'?S.orientBtnActive:{})}} onClick={()=>setOrient('landscape')}>↔ Хэвтээ</button>
                    </div>
                  </div>
                  <div>
                    <label style={S.fieldLabel}>Өргөн (мм)</label>
                    {/* BUG FIX 7: parseNum ашиглах — '0' оруулахад тэгшитгэл зөв ажиллана */}
                    <input style={S.fieldInput} type="text" inputMode="numeric" value={pW}
                      onFocus={e=>e.target.select()}
                      onChange={e=>{ setPaperSize('custom'); setPW(parseNum(e.target.value)) }}/>
                  </div>
                  <div>
                    <label style={S.fieldLabel}>Өндөр (мм)</label>
                    <input style={S.fieldInput} type="text" inputMode="numeric" value={pH}
                      onFocus={e=>e.target.select()}
                      onChange={e=>{ setPaperSize('custom'); setPH(parseNum(e.target.value)) }}/>
                  </div>
                </div>
              </div>

              <div style={{...S.card, marginTop:12}}>
                <div style={S.cardTitle}>Материалын хэмжээ</div>
                <div style={S.fieldRow}>
                  {[['Өргөн (мм)',mW,setMW],['Өндөр (мм)',mH,setMH],['Зайлуулах зай (мм)',gap,setGap],['Ирмэгийн зай (мм)',margin,setMargin]].map(([l,v,s])=>(
                    <div key={l}>
                      <label style={S.fieldLabel}>{l}</label>
                      <input style={S.fieldInput} type="text" inputMode="numeric" value={v}
                        onFocus={e=>e.target.select()}
                        onChange={e=>s(parseNum(e.target.value))}/>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{...S.card, marginTop:12}}>
                <div style={S.cardTitle}>Үнийн тохиргоо</div>
                <div style={S.fieldRow}>
                  {[
                    ['Нийт ширхэг',qty,setQty,null],
                    ['Ажиллагааны үнэ (₮)',setupCost,setSetupCost,null],
                    ['Хуудасны үнэ (₮)',printCost,setPrintCost,null],
                    // BUG FIX 8: overhead/vat-д 0-100 хооронд байх validation нэмэх
                    ['Нэмэгдэл (%)',overhead,(v)=>setOverhead(Math.min(100,Math.max(0,v))),null],
                    ['НӨАТ (%)',vat,(v)=>setVat(Math.min(100,Math.max(0,v))),null],
                  ].map(([l,v,s])=>(
                    <div key={l}>
                      <label style={S.fieldLabel}>{l}</label>
                      <input style={S.fieldInput} type="text" inputMode="numeric" value={v}
                        onFocus={e=>e.target.select()}
                        onChange={e=>s(parseNum(e.target.value))}/>
                    </div>
                  ))}
                </div>
              </div>

              <button style={S.calcBtn} onClick={()=>setActiveTab('result')}>Тооцоолох →</button>
            </div>
          )}

          {/* RESULT TAB */}
          {activeTab === 'result' && (
            <div style={{maxWidth:680}}>
              <div style={S.metricsGrid}>
                {[
                  ['Нэг хуудсанд', perSheet, 'ш'],
                  ['Нийт хуудас', fmt(sheetsNeeded), 'хуудас'],
                  ['Үр ашиг', efficiency.toFixed(1), '%'],
                  ['Нэгж өртөг', '₮'+unitCost.toFixed(1), '/ш'],
                ].map(([l,v,u])=>(
                  <div key={l} style={S.metricCard}>
                    <div style={S.mcLabel}>{l}</div>
                    <div style={S.mcVal}>{v}<span style={S.mcUnit}>{u}</span></div>
                  </div>
                ))}
              </div>
              <div style={S.twoCol}>
                <div style={S.card}>
                  <div style={S.cardTitle}>Байршуулалтын зураг</div>
                  <div style={S.paperVis}>
                    <PaperVis cols={cols} rows={rows} pW={pW} pH={pH} mW={mW} mH={mH} gap={gap} margin={margin}/>
                    <div style={S.visLabel}>{pW}×{pH}мм · {cols}×{rows} = {perSheet}ш</div>
                  </div>
                </div>
                <div style={S.card}>
                  <div style={S.cardTitle}>Зардлын задаргаа</div>
                  {[
                    ['Хуудасны зардал', fmt(sheetsNeeded*printCost)],
                    ['Ажиллагааны зардал', fmt(setupCost)],
                    [`Нэмэгдэл (${overhead}%)`, fmt(overheadAmt)],
                    [`НӨАТ (${vat}%)`, fmt(vatAmt)],
                  ].map(([l,v])=>(
                    <div key={l} style={S.brRow}>
                      <span style={S.brLabel}>{l}</span>
                      <span style={S.brVal}>₮{v}</span>
                    </div>
                  ))}
                  <div style={S.brTotal}>
                    <span style={S.brTL}>Нийт дүн</span>
                    <span style={S.brTV}>₮{fmt(total)}</span>
                  </div>
                  <button
                    style={{...S.saveBtn, ...(saving ? {opacity:0.7, cursor:'not-allowed'} : {})}}
                    onClick={saveCalc}
                    disabled={saving}
                  >
                    {saving ? 'Хадгалж байна...' : 'Хадгалах ↓'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div style={{maxWidth:680}}>
              {history.length === 0 ? (
                <div style={S.empty}>
                  <span style={{fontSize:40}}>📋</span>
                  <p>Хадгалагдсан тооцоо байхгүй байна</p>
                </div>
              ) : history.map(h => (
                <div key={h.id} style={S.histItem}>
                  <div style={S.histTop}>
                    <div>
                      <div style={S.histName}>{h.paper_size} / {h.material_w}×{h.material_h}мм</div>
                      <div style={{fontSize:11,color:'#94a3b8',marginTop:2}}>
                        {new Date(h.created_at).toLocaleDateString('mn-MN')}
                      </div>
                    </div>
                    <span style={S.histAmt}>₮{h.total?.toLocaleString()}</span>
                  </div>
                  <div style={S.histTags}>
                    <span style={S.tag}>{h.qty?.toLocaleString()} ш</span>
                    <span style={S.tag}>{h.per_sheet} ш/хуудас</span>
                    <span style={S.tag}>{h.efficiency}% үр ашиг</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}