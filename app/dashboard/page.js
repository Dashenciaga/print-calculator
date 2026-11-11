'use client'
import { useEffect, useRef, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import QuoteModal from '@/components/QuoteModal'
import { bestLayout, calculateJob } from '@/lib/printCost'

const CUT_COST = 20000 // Огтлоо — заавал

const PRODUCTS = {
  poster:   { t:'Постер',         s:'Нэг талтай · Офсет хэвлэл',     dig:false, fold:0,   faces:1, side:1, sheet:'B3', plate:3850, press:40000, spa:5,  pw:364, ph:515 },
  bifold:   { t:'Бифолд брошур',  s:'Хоёр нугалаа · Офсет',          dig:false, fold:50,  faces:4, side:2, sheet:'B3', plate:3850, press:40000, spa:5,  pw:148, ph:210 },
  trifold:  { t:'Трифолд брошур', s:'Гурван нугалаа · Офсет',         dig:false, fold:100, faces:4, side:2, sheet:'B3', plate:3850, press:40000, spa:5,  pw:99,  ph:210 },
  flyer:    { t:'Дижитал флайер', s:'Дижитал хэвлэл · Төмөргүй',     dig:true,  fold:0,   faces:1, side:1, sheet:'A4', plate:0,    press:0,     spa:16, pw:210, ph:297 },
  namecard: { t:'Нэрийн хуудас',  s:'Нэг/хоёр тал · Офсет',          dig:false, fold:0,   faces:1, side:1, sheet:'B3', plate:3850, press:40000, spa:5,  pw:90,  ph:55  },
  booklet:  { t:'Сэтгүүл/ном',    s:'Хоёр тал · Үдээстэй',           dig:false, fold:0,   faces:4, side:2, sheet:'A3', plate:3850, press:50000, spa:8,  pw:148, ph:210 },
  sticker:  { t:'Шошго/стикер',   s:'Нэг тал · Дижитал',             dig:true,  fold:0,   faces:1, side:1, sheet:'A4', plate:0,    press:0,     spa:16, pw:100, ph:100 },
  envelope: { t:'Дугтуй',         s:'Нэг тал · Офсет',               dig:false, fold:0,   faces:1, side:1, sheet:'B3', plate:3850, press:40000, spa:5,  pw:220, ph:110 },
}

const SHEET_SIZES = {
  B3: { w:364, h:515 }, A3: { w:297, h:420 }, A2: { w:420, h:594 },
  A4: { w:210, h:297 }, A5: { w:148, h:210 },
}

const PRESETS = [
  { id:'B3',  w:364, h:515, label:'B3',       sub:'364×515' },
  { id:'A3',  w:297, h:420, label:'A3',       sub:'297×420' },
  { id:'A4',  w:210, h:297, label:'A4',       sub:'210×297' },
  { id:'A5',  w:148, h:210, label:'A5',       sub:'148×210' },
  { id:'NC',  w:90,  h:55,  label:'Нэрийн',   sub:'90×55'   },
  { id:'A6',  w:148, h:105, label:'A6',       sub:'148×105' },
  { id:'DL',  w:210, h:99,  label:'DL',       sub:'210×99'  },
  { id:'A3H', w:420, h:297, label:'A3 хэвтээ',sub:'420×297' },
  { id:'cust',w:0,   h:0,   label:'✎ Дурын',  sub:''        },
]

// Зөвхөн зурна. Тоог bestLayout()-аас авна — canvas-ын пикселээр тоолохгүй.
function drawCanvas(canvas, sheetW, sheetH, itemW, itemH, grid) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const CW = canvas.width, CH = canvas.height, pad = 5
  ctx.clearRect(0, 0, CW, CH)
  if (!(sheetW > 0 && sheetH > 0)) return
  const sc = Math.min((CW - pad*2) / sheetW, (CH - pad*2) / sheetH)
  const sW = Math.round(sheetW * sc), sH = Math.round(sheetH * sc)
  const ox = Math.round((CW - sW) / 2), oy = Math.round((CH - sH) / 2)
  const dk = window.matchMedia('(prefers-color-scheme:dark)').matches
  ctx.fillStyle = dk ? '#1e1e2e' : '#f8f9fb'
  ctx.strokeStyle = dk ? 'rgba(79,70,229,.6)' : '#c7d2fe'
  ctx.lineWidth = 1
  ctx.beginPath(); ctx.roundRect(ox, oy, sW, sH, 2); ctx.fill(); ctx.stroke()
  let n = 0
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const x0 = ox + Math.round(c * itemW * sc), x1 = ox + Math.round((c + 1) * itemW * sc)
      const y0 = oy + Math.round(r * itemH * sc), y1 = oy + Math.round((r + 1) * itemH * sc)
      const w = Math.max(1, x1 - x0 - 1), h = Math.max(1, y1 - y0 - 1)
      ctx.fillStyle = dk ? 'rgba(79,70,229,.22)' : '#eef2ff'
      ctx.strokeStyle = dk ? 'rgba(129,140,248,.6)' : '#a5b4fc'
      ctx.lineWidth = 0.5
      ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 1); ctx.fill(); ctx.stroke()
      n++
      if (w > 11 && h > 8) {
        ctx.fillStyle = dk ? '#a5b4fc' : '#4f46e5'
        ctx.font = `${Math.max(6, Math.min(9, w / 3))}px ${getComputedStyle(canvas).fontFamily}`
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(n, x0 + w / 2, y0 + h / 2)
      }
    }
  }
}

const fmt = n => '₮' + Math.round(n).toLocaleString()
// Хуудасны тоо: бүхэл бол бүхлээр, бутархай бол 1 оронтой
const fmtN = n => n == null || !isFinite(n) ? '—'
  : n.toLocaleString(undefined, { maximumFractionDigits: Number.isInteger(n) ? 0 : 1 })

const S = {
  shell: { display:'flex', height:'100vh', background:'#f4f5f7', fontFamily:'var(--app-font)', overflow:'hidden' },
  sidebar: { width:180, background:'white', borderRight:'0.5px solid #e2e8f0', display:'flex', flexDirection:'column', flexShrink:0, overflowY:'auto' },
  sbHead: { padding:'12px 14px 8px', borderBottom:'0.5px solid #e2e8f0' },
  sbLabel: { fontSize:11, color:'#94a3b8', letterSpacing:'.05em', textTransform:'uppercase' },
  sbItem: (active) => ({ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', cursor:'pointer', border:'none', background: active ? 'white' : 'none', width:'100%', textAlign:'left', fontSize:13, color: active ? '#1a1f36' : '#64748b', borderLeft: active ? '2px solid #4f46e5' : '2px solid transparent', fontWeight: active ? 500 : 400, transition:'background .1s' }),
  sbDiv: { height:'0.5px', background:'#e2e8f0', margin:'4px 14px' },
  main: { flex:1, display:'flex', flexDirection:'column', overflow:'hidden' },
  topbar: { padding:'10px 16px', borderBottom:'0.5px solid #e2e8f0', background:'white', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 },
  body: { flex:1, overflowY:'auto', padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 },
  sectionLabel: { fontSize:10, fontWeight:500, color:'#94a3b8', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:6 },
  card: { background:'white', border:'0.5px solid #e2e8f0', borderRadius:12, padding:14 },
  grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 },
  grid3: { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 },
  grid4: { display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:8 },
  field: { display:'flex', flexDirection:'column', gap:4, marginBottom:8 },
  fieldLast: { display:'flex', flexDirection:'column', gap:4 },
  label: { fontSize:11, color:'#64748b' },
  input: { width:'100%', padding:'6px 9px', fontSize:12, border:'0.5px solid #e2e8f0', borderRadius:8, background:'white', color:'#1a1f36', outline:'none', boxSizing:'border-box' },
  select: { width:'100%', padding:'6px 9px', fontSize:12, border:'0.5px solid #e2e8f0', borderRadius:8, background:'white', color:'#1a1f36', outline:'none', boxSizing:'border-box' },
  tgl: { display:'flex', gap:2, background:'#f1f5f9', borderRadius:8, padding:2 },
  tglB: (on) => ({ flex:1, padding:'5px 4px', fontSize:11, border:'none', background: on ? 'white' : 'none', borderRadius:6, cursor:'pointer', color: on ? '#1a1f36' : '#64748b', fontWeight: on ? 500 : 400, boxShadow: on ? '0 0 0 0.5px #e2e8f0' : 'none', transition:'all .1s' }),
  presetGrid: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:4, marginBottom:8 },
  presetBtn: (on) => ({ padding:'5px 3px', fontSize:10, border: on ? '0.5px solid #a5b4fc' : '0.5px solid #e2e8f0', borderRadius:8, background: on ? '#eef2ff' : '#f8f9fb', cursor:'pointer', color: on ? '#4f46e5' : '#64748b', textAlign:'center', lineHeight:1.4, fontWeight: on ? 500 : 400 }),
  metric: { background:'#f8f9fb', borderRadius:8, padding:'10px 12px' },
  metricLabel: { fontSize:10, color:'#64748b', marginBottom:4 },
  metricVal: { fontSize:20, fontWeight:500, color:'#1a1f36', lineHeight:1 },
  metricUnit: { fontSize:10, color:'#94a3b8', marginLeft:2 },
  visBox: { background:'#f8f9fb', borderRadius:8, padding:10, display:'flex', gap:16, alignItems:'center', justifyContent:'center' },
  canvasCol: { display:'flex', flexDirection:'column', alignItems:'center', gap:4 },
  cvLabel: { fontSize:10, color:'#94a3b8', display:'flex', alignItems:'center', gap:4 },
  cvBadge: { fontSize:9, padding:'1px 6px', borderRadius:10, background:'#eef2ff', color:'#4f46e5', fontWeight:500 },
  flow: { display:'flex', alignItems:'center', gap:6, background:'#f8f9fb', borderRadius:8, padding:'8px 12px', flexWrap:'wrap' },
  flItem: { display:'flex', flexDirection:'column', alignItems:'center', gap:1 },
  flVal: { fontSize:12, fontWeight:500, color:'#1a1f36' },
  flLbl: { fontSize:10, color:'#94a3b8' },
  flArr: { fontSize:12, color:'#94a3b8', margin:'0 2px' },
  brRow: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0', borderBottom:'0.5px solid #f1f5f9', fontSize:12 },
  brL: { color:'#64748b' },
  brV: { fontWeight:500, color:'#1a1f36' },
  total: { background:'#eff6ff', borderRadius:8, padding:'10px 12px', display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 },
  totalGreen: { background:'#f0fdf4', borderRadius:8, padding:'10px 12px', display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8 },
  totalL: { fontSize:12, fontWeight:500, color:'#3b82f6' },
  totalLG: { fontSize:12, fontWeight:500, color:'#16a34a' },
  totalV: { fontSize:18, fontWeight:500, color:'#3b82f6' },
  totalVG: { fontSize:18, fontWeight:500, color:'#16a34a' },
  profitBtns: { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6, marginTop:8 },
  profitBtn: (on) => ({ padding:6, fontSize:11, border: on ? 'none' : '0.5px solid #e2e8f0', borderRadius:8, background: on ? '#eff6ff' : '#f8f9fb', cursor:'pointer', color: on ? '#3b82f6' : '#64748b', fontWeight: on ? 500 : 400 }),
  sep: { height:'0.5px', background:'#e2e8f0', margin:'8px 0' },
  chkRow: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'4px 0', fontSize:11 },
  chkL: { color:'#64748b', display:'flex', alignItems:'center', gap:5 },
  chkR: { display:'flex', alignItems:'center', gap:4 },
  chkInp: { width:62, padding:'3px 7px', fontSize:11, border:'0.5px solid #e2e8f0', borderRadius:8, background:'white', color:'#1a1f36', outline:'none', textAlign:'right' },
  badge: (type) => ({ fontSize:9, padding:'1px 6px', borderRadius:20, fontWeight:500, background: type==='req' ? '#f0fdf4' : '#fefce8', color: type==='req' ? '#16a34a' : '#ca8a04' }),
  qtyBox: { background:'#f8f9fb', borderRadius:8, padding:'10px 12px' },
  qtyRow: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'3px 0', fontSize:12 },
  qtyLbl: { color:'#64748b' },
  qtyInp: { width:72, padding:'4px 8px', fontSize:12, border:'0.5px solid #e2e8f0', borderRadius:8, background:'white', color:'#1a1f36', outline:'none', textAlign:'right' },
  qtyTotal: { display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:6, paddingTop:6, borderTop:'0.5px solid #e2e8f0' },
  info: { background:'#eff6ff', borderRadius:8, padding:'6px 10px', fontSize:11, color:'#3b82f6', marginTop:6 },
  hint: { fontSize:11, color:'#94a3b8', marginTop:3 },
  err: { background:'#fef2f2', border:'0.5px solid #fecaca', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#dc2626' },
  linkBtn: { border:'none', background:'none', padding:0, fontSize:11, color:'#4f46e5', cursor:'pointer', textDecoration:'underline' },
  manualInp: (manual) => ({ width:56, padding:'3px 7px', fontSize:11, border: manual ? '0.5px solid #facc15' : '0.5px solid #c7d2fe', borderRadius:6, background: manual ? '#fefce8' : 'white', color:'#1a1f36', outline:'none', textAlign:'right' }),
  sbUser: { display:'flex', alignItems:'center', gap:8, padding:'12px 14px', borderTop:'0.5px solid #e2e8f0', marginTop:'auto' },
  sbAvatar: { width:28, height:28, borderRadius:'50%', background:'#4f46e5', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:11, fontWeight:500, flexShrink:0 },
  sbUname: { fontSize:12, fontWeight:500, color:'#1a1f36' },
  sbEmail: { fontSize:10, color:'#94a3b8' },
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [curProd, setCurProd] = useState('poster')
  const [sides, setSides] = useState(1)
  const [profit, setProfit] = useState(30)
  const [printSheet, setPrintSheet] = useState('B3')
  const [psW, setPsW] = useState(364)
  const [psH, setPsH] = useState(515)
  const [activePreset, setActivePreset] = useState('B3')
  const [prodW, setProdW] = useState(364)
  const [prodH, setProdH] = useState(515)
  const [qty, setQty] = useState(100)
  const [perSheetManual, setPerSheetManual] = useState(null) // null = автоматаар
  const [qtyWaste, setQtyWaste] = useState(100)
  const [spa, setSpa] = useState(5)
  const [a0Price, setA0Price] = useState(1200)
  const [platePr, setPlatePr] = useState(3850)
  const [pressPr, setPressPr] = useState(40000)
  const [digPr, setDigPr] = useState(1500)
  const [faces, setFaces] = useState(1)
  const [vGlue, setVGlue] = useState(0)
  const [vFoldManual, setVFoldManual] = useState(null) // null = захиалгын тоо × тариф
  const [vLak, setVLak] = useState(0)
  const [vHolio, setVHolio] = useState(0)
  const [vTigel, setVTigel] = useState(0)
  const [vUdees, setVUdees] = useState(0)
  const [showQuote, setShowQuote] = useState(false)
  const [showSave, setShowSave] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const cvHRef = useRef(null)
  const cvVRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const { data: prof } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
      if (prof) setProfile(prof)
    }
    init()
  }, [])

  const p = PRODUCTS[curProd]

  const sheet = useMemo(() => (
    printSheet === 'custom'
      ? { w: psW || 364, h: psH || 515 }
      : SHEET_SIZES[printSheet] || SHEET_SIZES.B3
  ), [printSheet, psW, psH])

  // 1 хуудаст багтах тоо: хэвтээ, босоогийн аль ихийг нь (нэмэхгүй)
  const layout = useMemo(() => bestLayout(sheet.w, sheet.h, prodW, prodH), [sheet, prodW, prodH])
  const perSheet = perSheetManual ?? layout.perSheet
  const vFold = vFoldManual ?? (p.fold > 0 ? qty * p.fold : 0)

  // Excel-ийн томьёогоор: J = E × G / H + F, K = J / I ...
  const jobInput = useMemo(() => ({
    qty,
    waste:          qtyWaste,
    faces,
    multiPage:      p.faces > 1,
    twoSided:       sides === 2,
    perSheet,
    sheetsPerA0:    spa,
    a0Price,
    digital:        p.dig,
    platePrice:     platePr,
    pressPrice:     pressPr,
    digitalPrice:   digPr,
    finishingFixed: vGlue + vLak + vHolio + vTigel + vUdees + CUT_COST,
    foldPerUnit:    p.fold,
    foldManual:     vFoldManual,
    profitPct:      profit,
  }), [qty, qtyWaste, faces, p, sides, perSheet, spa, a0Price, platePr, pressPr, digPr, vGlue, vLak, vHolio, vTigel, vUdees, vFoldManual, profit])

  const { result, calcError } = useMemo(() => {
    try {
      return { result: calculateJob(jobInput), calcError: '' }
    } catch (e) {
      return { result: {}, calcError: e.message }
    }
  }, [jobInput])

  // Үнийн саналын хүснэгтэд бусад тоо ширхэгийн үнийг ЖИНХЭНЭ тооцоогоор гаргана
  const priceAt = q => {
    try { return calculateJob({ ...jobInput, qty: q }).client } catch { return 0 }
  }

  useEffect(() => {
    drawCanvas(cvHRef.current, sheet.w, sheet.h, prodW, prodH, layout.horizontal)
    drawCanvas(cvVRef.current, sheet.h, sheet.w, prodW, prodH, layout.vertical)
  }, [sheet, prodW, prodH, layout, user])

  function selectProduct(key) {
    const p = PRODUCTS[key]
    setCurProd(key)
    setSides(p.side)
    setPrintSheet(p.sheet)
    setSpa(p.spa)
    setPlatePr(p.plate)
    setPressPr(p.press)
    setProdW(p.pw)
    setProdH(p.ph)
    setFaces(p.faces)
    setActivePreset('cust')
    setVFoldManual(null)
    setPerSheetManual(null)
  }

  function handlePreset(pr) {
    setActivePreset(pr.id)
    if (pr.id === 'cust') return
    setProdW(pr.w)
    setProdH(pr.h)
    setPerSheetManual(null)
  }

  function handleSheetChange(val) {
    setPrintSheet(val)
    setPerSheetManual(null)
    const spaMap = { B3:5, A3:8, A2:4, A4:16, A5:32, custom:5 }
    setSpa(spaMap[val] || 5)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  async function handleSave() {
    if (!user || saving) return
    if (calcError) { setSaveMsg('Алдаа: ' + calcError); return }
    const name = saveName.trim() ||
      `${PRODUCTS[curProd].t} — ${new Date().toLocaleDateString('mn-MN')}`
    setSaving(true); setSaveMsg('')
    try {
      const supabase = createClient()
      // Хуудасны талбайн хэдэн хувийг бүтээгдэхүүн эзэлж байгаа вэ
      const efficiency = Math.min(100, Math.round(perSheet * prodW * prodH / (sheet.w * sheet.h) * 100)) || 0
      const { error } = await supabase.from('calculations').insert({
        user_id: user.id,
        name,
        paper_size: printSheet === 'custom' ? `${psW}×${psH}` : printSheet,
        paper_w: sheet.w, paper_h: sheet.h,
        material_w: prodW, material_h: prodH,
        qty,
        total: Math.round(result.total || 0),
        per_sheet: perSheet,
        efficiency,
      })
      if (error) { setSaveMsg('Алдаа: ' + error.message); return }
      setSaveMsg('✓ Хадгалагдлаа')
      setSaveName('')
      setTimeout(() => { setShowSave(false); setSaveMsg('') }, 1200)
    } finally { setSaving(false) }
  }

  const initials = (profile?.company_name || user?.email || '?').slice(0,2).toUpperCase()

  if (!user) return <div style={{minHeight:'100vh',background:'#f4f5f7',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748b',fontFamily:'var(--app-font)'}}>Ачааллаж байна...</div>

  return (
    <div style={S.shell}>
      {/* SIDEBAR */}
      <div style={S.sidebar}>
        <div style={S.sbHead}><span style={S.sbLabel}>Бүтээгдэхүүн</span></div>
        {Object.entries(PRODUCTS).map(([key, val], i) => (
          <div key={key}>
            {key === 'sticker' && <div style={S.sbDiv}/>}
            <button style={S.sbItem(curProd===key)} onClick={()=>selectProduct(key)}>
              {val.t}
            </button>
          </div>
        ))}
        <div style={{flex:1}}/>
        <div style={S.sbUser}>
          <div style={S.sbAvatar}>
            {profile?.logo_url
              ? <img src={profile.logo_url} alt="logo" style={{width:28,height:28,borderRadius:'50%',objectFit:'cover'}}/>
              : initials}
          </div>
          <div>
            <div style={S.sbUname}>{profile?.company_name || 'Компани'}</div>
            <div style={S.sbEmail}>{user?.email?.slice(0,22)}</div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div style={S.main}>
        <div style={S.topbar}>
          <div>
            <div style={{fontSize:14,fontWeight:500,color:'#1a1f36'}}>{p.t}</div>
            <div style={{fontSize:11,color:'#94a3b8',marginTop:1}}>{p.s}</div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button style={{fontSize:11,padding:'5px 12px',borderRadius:8,border:'0.5px solid #16a34a',background:'#f0fdf4',color:'#16a34a',cursor:'pointer',fontWeight:500}} onClick={()=>{setSaveName('');setSaveMsg('');setShowSave(true)}}>💾 Хадгалах</button>
            <button style={{fontSize:11,padding:'5px 12px',borderRadius:8,border:'none',background:'#4f46e5',color:'white',cursor:'pointer',fontWeight:500}} onClick={()=>setShowQuote(true)}>📋 Үнийн санал</button>
            <button style={{fontSize:11,padding:'5px 12px',borderRadius:8,border:'0.5px solid #e2e8f0',background:'none',color:'#64748b',cursor:'pointer'}} onClick={()=>router.push('/profile')}>Профайл</button>
            <button style={{fontSize:11,padding:'5px 12px',borderRadius:8,border:'0.5px solid #e2e8f0',background:'none',color:'#64748b',cursor:'pointer'}} onClick={handleLogout}>Гарах</button>
          </div>
        </div>

        <div style={S.body}>
          {calcError && <div style={S.err}>⚠ {calcError}. Бүтээгдэхүүний хэмжээ эсвэл «1 хуудаст» тоог шалгана уу.</div>}
          {/* ① ХЭВЛЭХ ЦААС */}
          <div>
            <div style={S.sectionLabel}>① Хэвлэх цаасны тохиргоо</div>
            <div style={S.grid3}>
              {/* Хэвлэх хуудас */}
              <div style={{...S.card,display:'flex',flexDirection:'column',gap:10}}>
                <div style={S.field}>
                  <label style={S.label}>Хэвлэх хуудасны хэмжээ</label>
                  <select style={S.select} value={printSheet} onChange={e=>handleSheetChange(e.target.value)}>
                    <option value="B3">B3 — 364×515мм</option>
                    <option value="A3">A3 — 297×420мм</option>
                    <option value="A2">A2 — 420×594мм</option>
                    <option value="A4">A4 — 210×297мм</option>
                    <option value="A5">A5 — 148×210мм</option>
                    <option value="custom">Дурын хэмжээ...</option>
                  </select>
                </div>
                {printSheet === 'custom' && (
                  <div style={S.grid2}>
                    <div style={S.fieldLast}><label style={S.label}>Өргөн мм</label><input type="number" style={S.input} value={psW} onFocus={e=>e.target.select()} onChange={e=>{setPsW(+e.target.value||0);setPerSheetManual(null)}}/></div>
                    <div style={S.fieldLast}><label style={S.label}>Өндөр мм</label><input type="number" style={S.input} value={psH} onFocus={e=>e.target.select()} onChange={e=>{setPsH(+e.target.value||0);setPerSheetManual(null)}}/></div>
                  </div>
                )}
                <div style={S.fieldLast}>
                  <label style={S.label}>Хэвлэлийн тал</label>
                  <div style={S.tgl}>
                    <button style={S.tglB(sides===1)} onClick={()=>setSides(1)}>Нэг тал</button>
                    <button style={S.tglB(sides===2)} onClick={()=>setSides(2)}>Хоёр тал</button>
                  </div>
                </div>
                {p.faces > 1 && (
                  <div style={S.fieldLast}><label style={S.label}>Нүүрийн тоо</label><input type="number" style={S.input} value={faces} onFocus={e=>e.target.select()} onChange={e=>setFaces(+e.target.value||4)}/></div>
                )}
              </div>

              {/* Бүтээгдэхүүний хэмжээ */}
              <div style={{...S.card,display:'flex',flexDirection:'column',gap:8}}>
                <div style={{fontSize:11,color:'#64748b',marginBottom:0}}>Бүтээгдэхүүний хэмжээ</div>
                <div style={S.presetGrid}>
                  {PRESETS.map(pr => (
                    <button key={pr.id} style={S.presetBtn(activePreset===pr.id)} onClick={()=>handlePreset(pr)}>
                      {pr.label}{pr.sub && <><br/><span style={{fontSize:9}}>{pr.sub}</span></>}
                    </button>
                  ))}
                </div>
                <div style={S.grid2}>
                  <div style={S.fieldLast}><label style={S.label}>Өргөн мм</label><input type="number" style={S.input} value={prodW} onFocus={e=>e.target.select()} onChange={e=>{setProdW(+e.target.value||0);setActivePreset('cust');setPerSheetManual(null)}}/></div>
                  <div style={S.fieldLast}><label style={S.label}>Өндөр мм</label><input type="number" style={S.input} value={prodH} onFocus={e=>e.target.select()} onChange={e=>{setProdH(+e.target.value||0);setActivePreset('cust');setPerSheetManual(null)}}/></div>
                </div>
                <div style={{...S.info,display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                  <span>1 хуудаст</span>
                  <input type="number" min={0} style={S.manualInp(perSheetManual!=null)} value={perSheet}
                    onFocus={e=>e.target.select()}
                    onChange={e=>setPerSheetManual(Math.max(0, Math.floor(+e.target.value||0)))}/>
                  <span>ш</span>
                  {perSheetManual != null
                    ? <button style={S.linkBtn} onClick={()=>setPerSheetManual(null)}>↺ авто ({layout.perSheet})</button>
                    : <span style={{color:'#94a3b8'}}>авто · хэвтээ {layout.horizontal.count}, босоо {layout.vertical.count}</span>}
                </div>
              </div>

              {/* Хэвлэх тоо */}
              <div style={{...S.card,display:'flex',flexDirection:'column',gap:10}}>
                <div style={{fontSize:11,color:'#64748b'}}>Хэвлэх тоо</div>
                <div style={S.qtyBox}>
                  <div style={S.qtyRow}>
                    <span style={S.qtyLbl}>Захиалгын тоо</span>
                    <input style={S.qtyInp} type="number" value={qty} onFocus={e=>e.target.select()} onChange={e=>setQty(+e.target.value||0)}/>
                  </div>
                  <div style={S.qtyRow}>
                    <span style={S.qtyLbl}>Хадаас</span>
                    <input style={S.qtyInp} type="number" value={qtyWaste} onFocus={e=>e.target.select()} onChange={e=>setQtyWaste(+e.target.value||0)}/>
                  </div>
                  <div style={S.qtyRow}>
                    <span style={S.qtyLbl}>Хэвлэх хуудас</span>
                    <span style={{fontSize:12,fontWeight:500,color:'#1a1f36'}}>{fmtN(result.printSheets)}</span>
                  </div>
                  <div style={S.qtyTotal}>
                    <span style={{fontSize:12,fontWeight:500,color:'#1a1f36'}}>Нийт хэвлэх</span>
                    <span style={{fontSize:14,fontWeight:500,color:'#1a1f36'}}>{fmtN(result.totalSheets)}</span>
                  </div>
                </div>
                <div style={S.hint}>
                  {qty.toLocaleString()} × {result.faces ?? '—'} нүүр ÷ {perSheet} + {qtyWaste} хадаас
                </div>
              </div>
            </div>
          </div>

          {/* ЗУРАГЛАЛ + FLOW */}
          <div style={S.grid2}>
            <div style={S.visBox}>
              <div style={S.canvasCol}>
                <canvas ref={cvHRef} width={140} height={105}/>
                <div style={S.cvLabel}>↔ Хэвтээ <span style={S.cvBadge}>{layout.horizontal.count}ш</span></div>
              </div>
              <div style={S.canvasCol}>
                <canvas ref={cvVRef} width={105} height={105}/>
                <div style={S.cvLabel}>↕ Босоо <span style={S.cvBadge}>{layout.vertical.count}ш</span></div>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              <div style={S.flow}>
                <div style={S.flItem}><div style={S.flVal}>{fmtN(result.totalSheets)} хуудас</div><div style={S.flLbl}>Нийт хуудас</div></div>
                <div style={S.flArr}>÷</div>
                <div style={S.flItem}><div style={S.flVal}>{spa}</div><div style={S.flLbl}>A0-аас хуудас</div></div>
                <div style={S.flArr}>=</div>
                <div style={S.flItem}><div style={S.flVal}>{fmtN(result.a0Sheets)}ш</div><div style={S.flLbl}>A0 цаас</div></div>
                <div style={S.flArr}>×</div>
                <div style={S.flItem}><div style={S.flVal}>₮{a0Price.toLocaleString()}</div><div style={S.flLbl}>A0 үнэ</div></div>
                <div style={S.flArr}>=</div>
                <div style={S.flItem}><div style={{...S.flVal,color:'#4f46e5'}}>{result.paperCost!=null?fmt(result.paperCost):'—'}</div><div style={S.flLbl}>Цаасны зардал</div></div>
              </div>
              <div style={S.grid4}>
                {[['1 хуудаст',perSheet+'ш'],['Нийт хуудас',fmtN(result.totalSheets)+' хуудас'],['A0 цаас',fmtN(result.a0Sheets)+'ш'],['Цаасны зардал',result.paperCost!=null?fmt(result.paperCost):'—']].map(([l,v])=>(
                  <div key={l} style={S.metric}>
                    <div style={S.metricLabel}>{l}</div>
                    <div style={{...S.metricVal,fontSize:14}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ② A0 ҮНЭ */}
          <div>
            <div style={S.sectionLabel}>② A0 цаасны үнийн тохиргоо</div>
            <div style={S.grid2}>
              <div style={{...S.card,display:'flex',flexDirection:'column',gap:8}}>
                <div style={S.field}><label style={S.label}>A0 нэгж үнэ (₮)</label><input type="number" style={S.input} value={a0Price} onFocus={e=>e.target.select()} onChange={e=>setA0Price(+e.target.value||0)}/></div>
                <div style={S.fieldLast}><label style={S.label}>Нэг A0-аас хэдэн хуудас гарах</label><input type="number" style={S.input} value={spa} onFocus={e=>e.target.select()} onChange={e=>setSpa(+e.target.value||1)}/></div>
                <div style={S.hint}>{printSheet === 'custom' ? 'Дурын' : printSheet} → нэг A0-аас {spa} ширхэг</div>
              </div>
              <div style={{...S.card,display:'flex',flexDirection:'column',gap:8}}>
                <div style={S.field}><label style={S.label}>Төмрийн нэгж үнэ (₮)</label><input type="number" style={S.input} value={platePr} onFocus={e=>e.target.select()} onChange={e=>setPlatePr(+e.target.value||0)}/></div>
                <div style={S.fieldLast}><label style={S.label}>Хэвлэлтийн даралтын үнэ (₮)</label><input type="number" style={S.input} value={pressPr} onFocus={e=>e.target.select()} onChange={e=>setPressPr(+e.target.value||0)}/></div>
                {p.dig && <div style={S.fieldLast}><label style={S.label}>Дижитал үнэ/хуудас (₮)</label><input type="number" style={S.input} value={digPr} onFocus={e=>e.target.select()} onChange={e=>setDigPr(+e.target.value||0)}/></div>}
              </div>
            </div>
          </div>

          {/* ③ БОЛОВСРУУЛАЛТ */}
          <div>
            <div style={S.sectionLabel}>③ Боловсруулалт · зардлын задаргаа</div>
            <div style={S.grid2}>
              <div style={S.card}>
                <div style={S.chkRow}><span style={S.chkL}>Хэвлэлтийн даралт <span style={S.badge('req')}>заавал</span></span><span style={{fontSize:11,fontWeight:500,color:'#1a1f36'}}>{result.pressCost!=null?fmt(result.pressCost):'—'}</span></div>
                <div style={S.sep}/>
                {[['Бүрэлт',vGlue,setVGlue],['Нугалаа',vFold,setVFoldManual],['Лак',vLak,setVLak],['Холио',vHolio,setVHolio],['Тигель',vTigel,setVTigel],['Үдээс',vUdees,setVUdees]].map(([label,val,setter])=>(
                  <div key={label} style={S.chkRow}>
                    <span style={S.chkL}>{label} <span style={S.badge('opt')}>сонголт</span></span>
                    <div style={S.chkR}><input type="number" style={S.chkInp} value={val} onFocus={e=>e.target.select()} onChange={e=>setter(+e.target.value||0)}/><span style={{fontSize:10,color:'#94a3b8'}}>₮</span></div>
                  </div>
                ))}
                <div style={S.chkRow}><span style={S.chkL}>Огтлоо <span style={S.badge('req')}>заавал</span></span><span style={{fontSize:11,fontWeight:500,color:'#1a1f36'}}>{fmt(CUT_COST)}</span></div>
              </div>
              <div style={S.card}>
                {[['Цаасны зардал',result.paperCost],['Төмрийн зардал',result.plateCost],['Хэвлэлтийн даралт',result.pressCost],['Боловсруулалт',result.finishing]].map(([l,v])=>(
                  <div key={l} style={{...S.brRow,borderBottom:'0.5px solid #f1f5f9'}}>
                    <span style={S.brL}>{l}</span>
                    <span style={S.brV}>{v!=null?fmt(v):'—'}</span>
                  </div>
                ))}
                <div style={S.total}>
                  <span style={S.totalL}>Нийт өртөг</span>
                  <span style={S.totalV}>{result.total!=null?fmt(result.total):'—'}</span>
                </div>
                <div style={S.sep}/>
                <div style={{fontSize:10,color:'#94a3b8',fontWeight:500,letterSpacing:'.05em',textTransform:'uppercase',marginBottom:6}}>Ашгийн нэмэгдэл</div>
                <div style={S.profitBtns}>
                  {[20,30,40].map(n=>(
                    <button key={n} style={S.profitBtn(profit===n)} onClick={()=>setProfit(n)}>+{n}%</button>
                  ))}
                </div>
                <div style={S.totalGreen}>
                  <span style={S.totalLG}>Үйлчлүүлэгчийн үнэ</span>
                  <span style={S.totalVG}>{result.client!=null?fmt(result.client):'—'}</span>
                </div>
                <div style={{textAlign:'right',fontSize:10,color:'#94a3b8',marginTop:5}}>Нэгж: <span style={{fontWeight:500,color:'#64748b'}}>{result.unit!=null?'₮'+result.unit.toFixed(1)+'/ш':'—'}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSave && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.45)',zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
          onClick={e=>e.target===e.currentTarget&&setShowSave(false)}>
          <div style={{background:'white',borderRadius:12,border:'0.5px solid #e2e8f0',width:'100%',maxWidth:380,padding:'20px 22px',fontFamily:'var(--app-font)'}}>
            <div style={{fontSize:14,fontWeight:600,color:'#1a1f36',marginBottom:4}}>Тооцоо хадгалах</div>
            <div style={{fontSize:11,color:'#64748b',marginBottom:14}}>Тооцоонд нэр өгнө үү</div>
            <label style={{fontSize:10,fontWeight:600,color:'#64748b',letterSpacing:'.05em',textTransform:'uppercase'}}>Тооцооны нэр</label>
            <input autoFocus type="text"
              placeholder={`${PRODUCTS[curProd].t} — ${new Date().toLocaleDateString('mn-MN')}`}
              value={saveName} onChange={e=>setSaveName(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&handleSave()}
              style={{width:'100%',padding:'8px 11px',fontSize:12,border:'0.5px solid #e2e8f0',borderRadius:8,marginTop:5,marginBottom:14,outline:'none',color:'#1a1f36',boxSizing:'border-box'}}/>
            {saveMsg && (
              <div style={{fontSize:11,padding:'6px 10px',borderRadius:6,marginBottom:10,
                background:saveMsg.startsWith('✓')?'#f0fdf4':'#fef2f2',
                color:saveMsg.startsWith('✓')?'#16a34a':'#dc2626'}}>{saveMsg}</div>
            )}
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setShowSave(false)} disabled={saving}
                style={{flex:1,padding:'8px',fontSize:12,border:'0.5px solid #e2e8f0',borderRadius:8,background:'#f8f9fb',color:'#64748b',cursor:'pointer',fontWeight:500}}>Цуцлах</button>
              <button onClick={handleSave} disabled={saving}
                style={{flex:1,padding:'8px',fontSize:12,border:'none',borderRadius:8,background:'#4f46e5',color:'white',cursor:saving?'wait':'pointer',fontWeight:600,opacity:saving?.7:1}}>
                {saving?'Хадгалж байна...':'Хадгалах'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showQuote && (
        <QuoteModal
          onClose={() => setShowQuote(false)}
          profile={profile}
          calcData={{
            baseCost: result.total || 0,
            priceAt,
            profitPct: profit,
            qty,
            printSheet: printSheet === 'custom' ? `${psW}×${psH}` : printSheet,
            prodW, prodH, sides,
            process: [
              vGlue && 'Бүрэлт', vFold && 'Нугалаа', vLak && 'Лак',
              vHolio && 'Холио', vTigel && 'Тигель', vUdees && 'Үдээс',
              'Огтлоо',
            ].filter(Boolean).join(' · '),
            productName: p.t,
          }}
        />
      )}
    </div>
  )
}