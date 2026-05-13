'use client'
import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import FeedbackButton from '@/app/components/FeedbackButton'

const PRODUCT_TYPES = {
  poster:    { label: 'Постер',            icon: '🖼️' },
  brochure:  { label: 'Брошур / Флайер',   icon: '📄' },
  magazine:  { label: 'Сэтгүүл / Каталог', icon: '📖' },
  calendar:  { label: 'Календар',          icon: '📅' },
  newspaper: { label: 'Сонин',             icon: '📰' },
  book:      { label: 'Ном / Дэвтэр',     icon: '📚' },
  blank:     { label: 'Бланк / Сертификат',icon: '📋' },
  sticker:   { label: 'Стикер',            icon: '🏷️' },
  namecard:  { label: 'Нэрийн хуудас',    icon: '💳' },
  packaging: { label: 'Сав баглаа',        icon: '📦' },
}

const PRINT_METHODS = [
  { id: 'offset',  label: 'Офсет' },
  { id: 'digital', label: 'Дижитал' },
]

const PAPER_SIZES = {
  'А0': [841,1189], 'А1': [594,841], 'А2': [420,594],
  'А3': [297,420],  'А4': [210,297], 'А5': [148,210],
  'В3': [353,500],  'В4': [250,353], 'В5': [176,250],
  '210х75': [210,75], '99х210': [99,210], 'Дурын': null,
}

const PAPER_WEIGHTS = [48,70,80,100,105,115,120,128,150,157,200,250,300]

const PAPER_PRICES = {
  48:210, 70:318, 80:336, 100:500, 105:630,
  115:700, 120:830, 128:770, 150:890, 157:950,
  200:1200, 250:1500, 300:1900,
}

// Цаасны зузаан мм/хуудас (жин → зузаан)
const PAPER_THICKNESS = {
  48:.05, 70:.07, 80:.09, 100:.11, 105:.12,
  115:.13, 120:.14, 128:.14, 150:.17, 157:.18,
  200:.22, 250:.28, 300:.33,
}

// Офсет хавтангийн тоо өнгөнөөс хамааран
const PLATE_COUNT = { '1+0':1, '1+1':2, '4+0':4, '4+4':8 }

const POST_PROCESS = [
  { id:'coating', label:'Бүрэлт (лакдалт)', defaultCost:40000 },
  { id:'tigel',   label:'Тигель (хайчлах)', defaultCost:20000 },
  { id:'lacquer', label:'Лак',              defaultCost:15000 },
  { id:'mix',     label:'Холио',            defaultCost:10000 },
  { id:'fold',    label:'Нугалаа',          defaultCost:10000 },
  { id:'glue',    label:'Наалт',            defaultCost:25000 },
  { id:'stitch',  label:'Үдээс / Оёдол',   defaultCost:30000 },
  { id:'cut',     label:'Огтлоо',           defaultCost:20000 },
]

const COLOR_OPTIONS = [
  { id:'1+0', label:'1+0 (нэг тал хар)' },
  { id:'1+1', label:'1+1 (хоёр тал хар)' },
  { id:'4+0', label:'4+0 (нэг тал өнгөт)' },
  { id:'4+4', label:'4+4 (хоёр тал өнгөт)' },
]

const MASTER_W = 889, MASTER_H = 1194

const C = {
  bg:'#f4f6fb', surface:'#ffffff', surfaceHover:'#f8faff',
  border:'#e2e8f3', borderHover:'#c5d0e8',
  accent:'#4f7cff', accentDim:'#3563e9', accentGlow:'rgba(79,124,255,0.10)',
  success:'#10b981', warn:'#f59e0b', danger:'#ef4444',
  text:'#111827', textMid:'#4b5a7a', textDim:'#9aa5bf',
  purple:'#7c3aed', teal:'#0d9488',
  sidebar:'#ffffff',
}

const inp = {
  width:'100%', padding:'8px 11px', fontSize:13, fontWeight:500,
  border:`1.5px solid ${C.border}`, borderRadius:7, background:'#ffffff',
  color:C.text, outline:'none', boxSizing:'border-box', transition:'border-color .15s',
}
const lbl = {
  display:'block', fontSize:10, fontWeight:700, color:C.textMid,
  marginBottom:4, letterSpacing:'.08em', textTransform:'uppercase',
}
const card = {
  background:C.surface, borderRadius:12, border:`1px solid ${C.border}`,
  padding:'18px 20px', marginBottom:14,
}
const sectionTitle = {
  fontSize:12, fontWeight:700, color:C.textMid,
  letterSpacing:'.06em', textTransform:'uppercase',
  marginBottom:14, display:'flex', alignItems:'center', gap:8,
}

export default function ProCalculator() {
  const router = useRouter()
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [activeSection, setActiveSection] = useState('calc')
  const [history, setHistory] = useState([])
  const [saving, setSaving]       = useState(false)
  const [saveModal, setSaveModal] = useState(false)
  const [calcName,  setCalcName]  = useState('')

  const [productType,  setProductType]  = useState('brochure')
  const [printMethod,  setPrintMethod]  = useState('offset')
  const [qty,          setQty]          = useState(500)
  const [paperSize,    setPaperSize]    = useState('А4')
  const [customW,      setCustomW]      = useState(210)
  const [customH,      setCustomH]      = useState(297)
  const [paperWeight,  setPaperWeight]  = useState(157)
  const [colorOption,  setColorOption]  = useState('4+4')
  const [pages,        setPages]        = useState(8)
  const [hascover,     setHascover]     = useState(false)
  const [coverWeight,  setCoverWeight]  = useState(250)
  const [orient,       setOrient]       = useState('portrait')
  const [marginMm,     setMarginMm]     = useState(5)
  const [gapMm,        setGapMm]        = useState(3)
  const [setupCost,        setSetupCost]        = useState(50000)
  const [pressureCost,     setPressureCost]     = useState(40000)
  const [setupManual,      setSetupManual]      = useState(false)
  const [pressureManual,   setPressureManual]   = useState(false)
  const [overhead,         setOverhead]         = useState(20)
  const [vat,              setVat]              = useState(10)
  const [postProc,     setPostProc]     = useState({
    coating:0, tigel:0, lacquer:0, mix:0, fold:0, glue:0, stitch:0, cut:20000,
  })
  const [postEnabled, setPostEnabled] = useState({
    coating:false, tigel:false, lacquer:false, mix:false,
    fold:false, glue:false, stitch:false, cut:true,
  })

  // Ажиллагааны үнэ автомат тооцоо
  const autoSetupCost = useMemo(() => {
    const base = {
      offset:  { '1+0':30000, '1+1':55000, '4+0':90000,  '4+4':150000 },
      digital: { '1+0':8000,  '1+1':12000, '4+0':12000,  '4+4':18000  },
    }
    const adj = {
      poster:9000, brochure:0, magazine:35000, calendar:18000,
      newspaper:45000, book:28000, blank:-8000, sticker:8000,
      namecard:0, packaging:25000,
    }
    const baseCost = (base[printMethod]?.[colorOption] ?? 50000) + (adj[productType] ?? 0)
    // Олон нүүрт бүтээгдэхүүн: 4 нүүр тутам нэмэлт хавтан хийгдэнэ
    const isMultiPage = ['magazine','book','newspaper','calendar'].includes(productType)
    if (isMultiPage && pages > 4) {
      const extraForms = Math.floor((pages - 4) / 4)
      const perFormCost = printMethod === 'offset' ? 15000 : 3000
      return baseCost + extraForms * perFormCost
    }
    return baseCost
  }, [printMethod, colorOption, productType, pages])

  // Даралтын үнэ автомат тооцоо
  const autoPressureCost = useMemo(() => {
    if (printMethod === 'digital') return 80000
    if (paperWeight <= 80)  return 32000
    if (paperWeight <= 128) return 45000
    if (paperWeight <= 200) return 58000
    return 72000
  }, [printMethod, paperWeight])

  useEffect(() => {
    if (!setupManual) setSetupCost(autoSetupCost)
  }, [autoSetupCost, setupManual])

  useEffect(() => {
    if (!pressureManual) setPressureCost(autoPressureCost)
  }, [autoPressureCost, pressureManual])

  const loadHistory = useCallback(async (uid) => {
    const supabase = createClient()
    const { data } = await supabase
      .from('calculations')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(30)
    if (data) setHistory(data)
  }, [])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const { data: prof } = await supabase
        .from('profiles').select('*').eq('user_id', user.id).single()
      setProfile(prof)
      loadHistory(user.id)
    }
    init()
  }, [loadHistory, router])

  const togglePost = (id) => {
    const def = POST_PROCESS.find(p => p.id === id).defaultCost
    const nowEnabled = !postEnabled[id]
    setPostEnabled(p => ({ ...p, [id]: nowEnabled }))
    setPostProc(p => ({ ...p, [id]: nowEnabled ? def : 0 }))
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  async function saveCalc() {
    if (!user) return
    const name = calcName.trim() ||
      `${PRODUCT_TYPES[productType]?.label} — ${new Date().toLocaleDateString('mn-MN')}`
    setSaving(true)
    setSaveModal(false)
    setCalcName('')
    try {
      const supabase = createClient()
      await supabase.from('calculations').insert({
        user_id:    user.id,
        name,
        paper_size: paperSize,
        paper_w:    result.pw,
        paper_h:    result.ph,
        material_w: result.pw,
        material_h: result.ph,
        qty,
        total:      Math.round(result.total),
        per_sheet:  result.perSheet,
        efficiency: Math.round(result.efficiency * 10) / 10,
      })
      await loadHistory(user.id)
      setActiveSection('history')
    } finally {
      setSaving(false)
    }
  }

  function handlePrint() {
    const win = window.open('', '_blank')
    win.document.write(`<!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>Үнийн санал — ${profile?.company_name || 'PrintCalc'}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:system-ui,sans-serif;color:#1a1f36;padding:40px;font-size:13px}
        .hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:14px;border-bottom:2.5px solid #4f46e5}
        .co{font-size:20px;font-weight:800;color:#1a1f36}.dt{font-size:12px;color:#64748b;margin-top:3px}.dn{font-size:11px;color:#94a3b8;margin-top:2px}
        h2{font-size:11px;font-weight:700;color:#64748b;letter-spacing:.08em;text-transform:uppercase;margin:20px 0 8px}
        table{width:100%;border-collapse:collapse;margin-bottom:16px}
        td,th{padding:7px 10px;text-align:left;font-size:12px;border-bottom:1px solid #e2e8f0}
        th{font-weight:600;color:#94a3b8;background:#f8f9fb;font-size:10px;text-transform:uppercase;letter-spacing:.05em}
        td:last-child,th:last-child{text-align:right}
        .tot td{font-weight:700;font-size:15px;color:#4f46e5;border-top:2px solid #4f46e5;border-bottom:none;padding-top:10px}
        .pg{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px}
        .pc{background:#f5f3ff;border:1px solid #a5b4fc;border-radius:8px;padding:12px;text-align:center}
        .pc .pl{font-size:10px;color:#6366f1;font-weight:700;text-transform:uppercase;letter-spacing:.06em;margin-bottom:5px}
        .pc .pv{font-size:20px;font-weight:800;color:#4f46e5}
        .pc .pu{font-size:10px;color:#94a3b8;margin-top:3px}
        .ft{margin-top:36px;padding-top:12px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center}
        @media print{body{padding:20px}}
      </style></head><body>
      <div class="hdr">
        <div>
          <div class="co">${profile?.company_name || 'Компани'}</div>
          <div class="dt">Хэвлэлийн үнийн санал</div>
          <div class="dn">№ ${Date.now().toString().slice(-6)} · ${new Date().toLocaleDateString('mn-MN')}</div>
        </div>
        <div style="text-align:right;font-size:12px;color:#64748b">${user?.email || ''}</div>
      </div>
      <h2>Захиалгын мэдээлэл</h2>
      <table>
        <tr><th>Мэдээлэл</th><th>Утга</th></tr>
        <tr><td>Бүтээгдэхүүн</td><td>${PRODUCT_TYPES[productType]?.label || productType}</td></tr>
        <tr><td>Хэмжээ</td><td>${result.pw}×${result.ph}мм (${paperSize})</td></tr>
        <tr><td>Хэвлэх арга</td><td>${printMethod === 'offset' ? 'Офсет' : 'Дижитал'}</td></tr>
        <tr><td>Өнгө</td><td>${colorOption}</td></tr>
        <tr><td>Цаасны жин</td><td>${paperWeight} гр/м²</td></tr>
        <tr><td>Нийт нүүр</td><td>${pages} нүүр</td></tr>
        <tr><td>Ширхэг</td><td>${qty.toLocaleString()} ш</td></tr>
      </table>
      <h2>Зардлын задаргаа</h2>
      <table>
        <tr><th>Зардлын нэр</th><th>Дүн (₮)</th></tr>
        ${result.breakdown.map(({l,v}) => `<tr><td>${l}</td><td>${v > 0 ? Math.round(v).toLocaleString() : '—'}</td></tr>`).join('')}
        <tr class="tot"><td>Нийт өртөг</td><td>₮${Math.round(result.total).toLocaleString()}</td></tr>
      </table>
      <h2>Үнийн санал</h2>
      <div class="pg">
        ${[20,30,40].map(m => {
          const price = result.total * (1 + m/100)
          const unit  = qty > 0 ? price/qty : 0
          return `<div class="pc"><div class="pl">${m}% ашигтай</div><div class="pv">₮${Math.round(price).toLocaleString()}</div><div class="pu">нэгж: ₮${unit.toFixed(1)}</div></div>`
        }).join('')}
      </div>
      <div class="ft">PrintCalc · ${new Date().getFullYear()} · Хэвлэлийн зардлын тооцоолуур</div>
      <script>window.onload=function(){window.print()}<\/script>
    </body></html>`)
    win.document.close()
  }

  const result = useMemo(() => {
    const [pw, ph] = paperSize === 'Дурын'
      ? (orient === 'landscape'
          ? [Math.max(customW,customH), Math.min(customW,customH)]
          : [Math.min(customW,customH), Math.max(customW,customH)])
      : orient === 'landscape'
        ? [PAPER_SIZES[paperSize][1], PAPER_SIZES[paperSize][0]]
        : PAPER_SIZES[paperSize]

    const usableW = MASTER_W - 2*marginMm
    const usableH = MASTER_H - 2*marginMm
    const cols = pw > 0 ? Math.max(0, Math.floor((usableW+gapMm)/(pw+gapMm))) : 0
    const rows = ph > 0 ? Math.max(0, Math.floor((usableH+gapMm)/(ph+gapMm))) : 0
    const perSheet = cols * rows

    const innerPages = hascover ? Math.max(0, pages-4) : pages
    const sidesPerSheet = colorOption.endsWith('+4') || colorOption.endsWith('+1') ? 2 : 1
    const pagesPerSheet = perSheet * sidesPerSheet
    const innerSheets = innerPages > 0 && pagesPerSheet > 0
      ? Math.ceil(innerPages/pagesPerSheet) * qty : 0
    // Нуруугийн өргөн: хуудасны тоо × цаасны зузаан (мм)
    const spineWidth = hascover
      ? Math.max(2, Math.round((innerPages / 2) * (PAPER_THICKNESS[paperWeight] || 0.1)))
      : 0
    const coverSheets = hascover
      ? Math.ceil(qty / Math.max(1,
          Math.floor((usableW+gapMm)/((pw*2+spineWidth)+gapMm)) *
          Math.floor((usableH+gapMm)/(ph+gapMm)))) : 0
    const totalSheets = innerSheets + coverSheets

    const innerPaperPrice = PAPER_PRICES[paperWeight] || 950
    const coverPaperPrice = PAPER_PRICES[coverWeight] || 1500
    const totalPaperCost = innerSheets*innerPaperPrice + coverSheets*coverPaperPrice
    // Хавтангийн тоо: 1+1→2, 4+4→8 (хоёр талыг тооцно)
    const plateCost = printMethod === 'offset' ? (PLATE_COUNT[colorOption] || 4) * 3850 : 0
    // Даралтын зардал: хуудас 0 бол 0
    const pressureTotal = totalSheets > 0 ? pressureCost * Math.ceil(totalSheets/1000) : 0
    const postTotal = Object.values(postProc).reduce((s,v) => s+(v||0), 0)

    const subtotal = setupCost + totalPaperCost + plateCost + pressureTotal + postTotal
    const overheadAmt = subtotal*(overhead/100)
    const base = subtotal + overheadAmt
    const vatAmt = base*(vat/100)
    const total = base + vatAmt
    const unitCost = qty > 0 ? total/qty : 0
    const efficiency = pagesPerSheet > 0 && innerPages > 0
      ? (innerPages/(Math.ceil(innerPages/pagesPerSheet)*pagesPerSheet)*100) : 100

    return {
      pw, ph, cols, rows, perSheet, pagesPerSheet,
      innerSheets, coverSheets, totalSheets, spineWidth,
      totalPaperCost, plateCost, pressureTotal, postTotal,
      setupCost, overheadAmt, vatAmt, total, unitCost, efficiency,
      breakdown: [
        { l:'Цаасны зардал',   v:totalPaperCost },
        { l:'Ажиллагааны үнэ', v:setupCost },
        { l:'Өнгөний хавтан',  v:plateCost },
        { l:'Даралтын зардал', v:pressureTotal },
        { l:'Боловсруулалт',   v:postTotal },
        { l:`Нэмэгдэл ${overhead}%`, v:overheadAmt },
        { l:`НӨАТ ${vat}%`,    v:vatAmt },
      ],
    }
  }, [productType, printMethod, qty, paperSize, customW, customH, paperWeight,
      colorOption, pages, hascover, coverWeight, orient, marginMm, gapMm,
      setupCost, pressureCost, overhead, vat, postProc])

  const fmt  = n => Math.round(n).toLocaleString()
  const fmtU = n => n >= 1000000 ? `₮${(n/1000000).toFixed(1)}сая` : `₮${fmt(n)}`
  const initials = (profile?.company_name || user?.email || '?').slice(0,2).toUpperCase()

  if (!user) return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',justifyContent:'center',color:C.textMid}}>
      Ачааллаж байна...
    </div>
  )

  return (
    <div style={{display:'flex',minHeight:'100vh',background:C.bg,fontFamily:"'DM Sans','Helvetica Neue',sans-serif",color:C.text}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box}
        input:focus,select:focus{border-color:${C.accent}!important;box-shadow:0 0 0 3px ${C.accentGlow}}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${C.bg}}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:10px}
        .prod-btn:hover{background:${C.surfaceHover}!important;border-color:${C.borderHover}!important}
        .post-btn:hover{border-color:${C.accent}!important}
        .calc-row:hover td{background:${C.bg}}
        .sb-item:hover{color:${C.accent}!important;background:${C.accentGlow}!important}
        .hist-item:hover{border-color:${C.borderHover}!important}
        @media(max-width:900px){
          .pro-main{flex-direction:column!important}
          .pro-left{width:100%!important;border-right:none!important;border-bottom:1px solid ${C.border}!important}
          .pro-right{padding:16px!important}
          .metrics-3{grid-template-columns:1fr 1fr!important}
          .two-col{grid-template-columns:1fr!important}
          .price-3{grid-template-columns:1fr 1fr!important}
        }
        @media(max-width:600px){
          .metrics-3{grid-template-columns:1fr!important}
          .price-3{grid-template-columns:1fr!important}
          .prod-grid{grid-template-columns:1fr 1fr!important}
        }
      `}</style>

      {/* ── SIDEBAR ── */}
      <div style={{width:210,background:C.sidebar,display:'flex',flexDirection:'column',flexShrink:0,position:'fixed',top:0,left:0,bottom:0,zIndex:10,borderRight:`1.5px solid ${C.border}`,boxShadow:'2px 0 12px rgba(0,0,0,0.04)'}}>
        {/* Logo */}
        <div style={{display:'flex',alignItems:'center',gap:9,padding:'18px 16px 20px'}}>
          <svg width="32" height="32" viewBox="0 0 75 80" fill="none" style={{flexShrink:0}}>
            <rect x="8"  y="4"  width="7" height="46" rx="3.5" fill="#4f46e5" opacity="0.85"/>
            <rect x="8"  y="58" width="7" height="10" rx="3.5" fill="#4f46e5" opacity="0.35"/>
            <rect x="21" y="4"  width="7" height="22" rx="3.5" fill="#4f46e5" opacity="0.6"/>
            <rect x="21" y="34" width="7" height="42" rx="3.5" fill="#4f46e5" opacity="0.85"/>
            <rect x="34" y="4"  width="7" height="58" rx="3.5" fill="#818cf8" opacity="0.9"/>
            <rect x="34" y="70" width="7" height="6"  rx="3.5" fill="#818cf8" opacity="0.3"/>
            <rect x="47" y="14" width="7" height="10" rx="3.5" fill="#4f46e5" opacity="0.4"/>
            <rect x="47" y="32" width="7" height="34" rx="3.5" fill="#4f46e5" opacity="0.75"/>
            <rect x="60" y="4"  width="7" height="50" rx="3.5" fill="#4f46e5" opacity="0.55"/>
            <rect x="60" y="62" width="7" height="14" rx="3.5" fill="#4f46e5" opacity="0.3"/>
          </svg>
          <div>
            <div style={{color:C.text,fontSize:13,fontWeight:700,letterSpacing:'-.2px'}}>PrintCalc</div>
          </div>
        </div>

        {/* Nav */}
        <div style={{fontSize:9,color:C.textDim,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',padding:'0 16px 8px'}}>Үндсэн</div>
        {[
          {id:'calc',    label:'Тооцоо',  icon:<path d="M9 7h6M9 12h6M9 17h4"/>},
          {id:'history', label:'Түүх',    icon:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>},
        ].map(t => (
          <button key={t.id} className="sb-item" onClick={() => setActiveSection(t.id)} style={{
            display:'flex',alignItems:'center',gap:8,padding:'8px 16px',
            fontSize:12,color:activeSection===t.id ? C.accent : C.textMid,
            cursor:'pointer',border:'none',background:activeSection===t.id ? C.accentGlow : 'none',
            width:'100%',textAlign:'left',transition:'all .15s',borderRadius:0,
          }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">{t.icon}</svg>
            {t.label}
          </button>
        ))}

        <div style={{height:14}}/>
        <div style={{fontSize:9,color:C.textDim,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',padding:'0 16px 8px'}}>Тохиргоо</div>
        <button className="sb-item" onClick={() => router.push('/profile')} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 16px',fontSize:12,color:C.textMid,cursor:'pointer',border:'none',background:'none',width:'100%',textAlign:'left',transition:'all .15s'}}>
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
          </svg>
          Профайл
        </button>

        <div style={{flex:1}}/>

        {/* User */}
        <div style={{display:'flex',alignItems:'center',gap:8,padding:'12px 16px',borderTop:`0.5px solid ${C.border}`}}>
          <div style={{width:28,height:28,borderRadius:'50%',background:C.accentDim,display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:10,fontWeight:700,flexShrink:0,overflow:'hidden'}}>
            {profile?.logo_url
              ? <img src={profile.logo_url} alt="logo" style={{width:28,height:28,objectFit:'cover'}}/>
              : initials}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{color:C.textMid,fontSize:11,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{profile?.company_name || 'Компани'}</div>
            <div style={{color:C.textDim,fontSize:9,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.email?.slice(0,22)}</div>
          </div>
          <button onClick={handleLogout} title="Гарах" style={{background:'none',border:'none',cursor:'pointer',color:C.textDim,padding:4,display:'flex',flexShrink:0}}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{marginLeft:210,flex:1,display:'flex',flexDirection:'column',minHeight:'100vh'}}>


        {/* HISTORY TAB */}
        {activeSection === 'history' && (
          <div style={{flex:1,padding:'24px',overflowY:'auto'}}>
            <div style={{maxWidth:720,margin:'0 auto'}}>
              <div style={{marginBottom:20}}>
                <div style={{fontSize:16,fontWeight:800,color:C.text,letterSpacing:'-.3px'}}>Тооцооны түүх</div>
                <div style={{fontSize:12,color:C.textMid,marginTop:3}}>Хадгалагдсан бүх тооцоо</div>
              </div>
              {history.length === 0 ? (
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'80px 20px',gap:12,color:C.textMid,textAlign:'center'}}>
                  <div style={{fontSize:40}}>📋</div>
                  <p style={{fontSize:14}}>Хадгалагдсан тооцоо байхгүй байна</p>
                  <button onClick={() => setActiveSection('calc')} style={{padding:'9px 20px',background:C.accent,color:'white',border:'none',borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',marginTop:8}}>
                    Тооцоо хийх →
                  </button>
                </div>
              ) : history.map(h => (
                <div key={h.id} className="hist-item" style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,padding:'14px 16px',marginBottom:10,transition:'border-color .15s',cursor:'default'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:700,color:C.text}}>{h.name || `${h.paper_size} / ${h.material_w}×${h.material_h}мм`}</div>
                      <div style={{fontSize:11,color:C.textDim,marginTop:3}}>{h.paper_size} · {new Date(h.created_at).toLocaleDateString('mn-MN')}</div>
                    </div>
                    <span style={{fontSize:16,fontWeight:800,color:C.accent}}>₮{h.total?.toLocaleString()}</span>
                  </div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {[
                      `${h.qty?.toLocaleString()} ш`,
                      `${h.per_sheet} ш/хуудас`,
                      `${h.efficiency}% үр ашиг`,
                    ].map(tag => (
                      <span key={tag} style={{fontSize:11,color:C.textMid,background:C.bg,padding:'2px 9px',borderRadius:20,border:`1px solid ${C.border}`}}>{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CALC TAB */}
        {activeSection === 'calc' && (
          <div className="pro-main" style={{display:'flex',flex:1,overflow:'hidden'}}>

            {/* Left: inputs */}
            <div className="pro-left" style={{width:420,flexShrink:0,overflowY:'auto',padding:'20px 16px',borderRight:`1px solid ${C.border}`}}>

              {/* Бүтээгдэхүүний төрөл */}
              <div style={card}>
                <div style={sectionTitle}><span>📦</span> Бүтээгдэхүүний төрөл</div>
                <div className="prod-grid" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}>
                  {Object.entries(PRODUCT_TYPES).map(([k,v]) => (
                    <button key={k} className="prod-btn" onClick={() => setProductType(k)} style={{
                      display:'flex',alignItems:'center',gap:7,padding:'8px 10px',
                      background:productType===k ? C.accentGlow : C.bg,
                      border:`1.5px solid ${productType===k ? C.accent : C.border}`,
                      borderRadius:8,cursor:'pointer',textAlign:'left',
                      color:productType===k ? C.accent : C.textMid,
                      fontSize:12,fontWeight:productType===k ? 700 : 500,transition:'all .15s',
                    }}>
                      <span style={{fontSize:15}}>{v.icon}</span>{v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Хэвлэх арга */}
              <div style={card}>
                <div style={sectionTitle}><span>🖨️</span> Хэвлэх арга</div>
                <div style={{display:'flex',background:C.bg,borderRadius:8,border:`1.5px solid ${C.border}`,overflow:'hidden'}}>
                  {PRINT_METHODS.map(m => (
                    <button key={m.id} onClick={() => setPrintMethod(m.id)} style={{
                      flex:1,padding:'9px',fontSize:13,fontWeight:600,border:'none',
                      background:printMethod===m.id ? C.accentGlow : 'none',
                      color:printMethod===m.id ? C.accent : C.textMid,cursor:'pointer',transition:'all .15s',
                    }}>{m.label}</button>
                  ))}
                </div>
              </div>

              {/* Цаасны тохиргоо */}
              <div style={card}>
                <div style={sectionTitle}><span>📐</span> Цаасны тохиргоо</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                  <div>
                    <label style={lbl}>Хэмжээ</label>
                    <select style={inp} value={paperSize} onChange={e => setPaperSize(e.target.value)}>
                      {Object.keys(PAPER_SIZES).map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Чиглэл</label>
                    <div style={{display:'flex',background:C.bg,borderRadius:7,border:`1.5px solid ${C.border}`,overflow:'hidden'}}>
                      {['portrait','landscape'].map(o => (
                        <button key={o} onClick={() => setOrient(o)} style={{
                          flex:1,padding:'8px 4px',fontSize:11,fontWeight:600,border:'none',
                          background:orient===o ? C.accentGlow : 'none',
                          color:orient===o ? C.accent : C.textMid,cursor:'pointer',
                        }}>{o==='portrait' ? '↕ Босоо' : '↔ Хэвтээ'}</button>
                      ))}
                    </div>
                  </div>
                </div>
                {paperSize === 'Дурын' && (
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                    <div>
                      <label style={lbl}>Өргөн (мм)</label>
                      <input style={inp} type="number" value={customW} onFocus={e => e.target.select()} onChange={e => setCustomW(+e.target.value||0)}/>
                    </div>
                    <div>
                      <label style={lbl}>Өндөр (мм)</label>
                      <input style={inp} type="number" value={customH} onFocus={e => e.target.select()} onChange={e => setCustomH(+e.target.value||0)}/>
                    </div>
                  </div>
                )}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                  <div>
                    <label style={lbl}>Цаасны жин (гр/м²)</label>
                    <select style={inp} value={paperWeight} onChange={e => setPaperWeight(+e.target.value)}>
                      {PAPER_WEIGHTS.map(w => <option key={w} value={w}>{w} гр/м² — ₮{PAPER_PRICES[w]}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Ирмэгийн зай (мм)</label>
                    <input style={inp} type="number" value={marginMm} onFocus={e => e.target.select()} onChange={e => setMarginMm(+e.target.value||0)}/>
                  </div>
                  <div>
                    <label style={lbl}>Зайлуулах зай (мм)</label>
                    <input style={inp} type="number" value={gapMm} onFocus={e => e.target.select()} onChange={e => setGapMm(+e.target.value||0)}/>
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:hascover?10:0}}>
                  <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',fontSize:12,color:C.textMid}}>
                    <input type="checkbox" checked={hascover} onChange={e => setHascover(e.target.checked)} style={{accentColor:C.accent}}/>
                    Хавтас (тусдаа цаас)
                  </label>
                </div>
                {hascover && (
                  <div style={{marginTop:10}}>
                    <label style={lbl}>Хавтасны жин (гр/м²)</label>
                    <select style={inp} value={coverWeight} onChange={e => setCoverWeight(+e.target.value)}>
                      {PAPER_WEIGHTS.map(w => <option key={w} value={w}>{w} гр/м² — ₮{PAPER_PRICES[w]}</option>)}
                    </select>
                  </div>
                )}
              </div>

              {/* Хэвлэлтийн тохиргоо */}
              <div style={card}>
                <div style={sectionTitle}><span>🎨</span> Хэвлэлтийн тохиргоо</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                  <div>
                    <label style={lbl}>Өнгө</label>
                    <select style={inp} value={colorOption} onChange={e => setColorOption(e.target.value)}>
                      {COLOR_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Нийт нүүрийн тоо</label>
                    <input style={inp} type="number" value={pages} onFocus={e => e.target.select()} onChange={e => setPages(+e.target.value||0)}/>
                  </div>
                </div>
                <div>
                  <label style={lbl}>Нийт ширхэг</label>
                  <input style={inp} type="number" value={qty} onFocus={e => e.target.select()} onChange={e => setQty(+e.target.value||0)}/>
                </div>
              </div>

              {/* Боловсруулалт */}
              <div style={card}>
                <div style={sectionTitle}><span>⚙️</span> Боловсруулалт</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:10}}>
                  {POST_PROCESS.map(p => (
                    <button key={p.id} className="post-btn" onClick={() => togglePost(p.id)} style={{
                      display:'flex',alignItems:'center',justifyContent:'space-between',
                      padding:'7px 10px',background:postEnabled[p.id] ? C.accentGlow : C.bg,
                      border:`1.5px solid ${postEnabled[p.id] ? C.accent : C.border}`,
                      borderRadius:7,cursor:'pointer',fontSize:11,fontWeight:500,
                      color:postEnabled[p.id] ? C.accent : C.textMid,transition:'all .15s',
                    }}>
                      <span>{p.label}</span>
                      {postEnabled[p.id] && <span style={{fontSize:10,opacity:.7}}>✓</span>}
                    </button>
                  ))}
                </div>
                {POST_PROCESS.filter(p => postEnabled[p.id]).map(p => (
                  <div key={p.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:6}}>
                    <div style={{fontSize:12,color:C.textMid,display:'flex',alignItems:'center'}}>{p.label}</div>
                    <input style={{...inp,textAlign:'right'}} type="number" value={postProc[p.id]}
                      onFocus={e => e.target.select()}
                      onChange={e => setPostProc(pp => ({...pp,[p.id]:+e.target.value||0}))}/>
                  </div>
                ))}
              </div>

              {/* Үнийн тохиргоо */}
              <div style={card}>
                <div style={sectionTitle}><span>💰</span> Үнийн тохиргоо</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  {/* Ажиллагааны үнэ — auto */}
                  <div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                      <label style={{...lbl,marginBottom:0}}>Ажиллагааны үнэ (₮)</label>
                      {!setupManual
                        ? <span style={{fontSize:9,color:C.success,fontWeight:700,letterSpacing:'.06em',background:'rgba(29,212,160,0.1)',padding:'1px 6px',borderRadius:4}}>AUTO</span>
                        : <button onClick={()=>{setSetupManual(false);setSetupCost(autoSetupCost)}} style={{fontSize:9,color:C.accent,background:'none',border:'none',cursor:'pointer',padding:0,fontWeight:700}}>↺ reset</button>
                      }
                    </div>
                    <input style={{...inp, borderColor: setupManual ? C.warn : C.border}} type="number" value={setupCost}
                      onFocus={e => e.target.select()}
                      onChange={e => { setSetupManual(true); setSetupCost(+e.target.value||0) }}/>
                  </div>
                  {/* Даралтын үнэ — auto */}
                  <div>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                      <label style={{...lbl,marginBottom:0}}>Даралтын үнэ (₮)</label>
                      {!pressureManual
                        ? <span style={{fontSize:9,color:C.success,fontWeight:700,letterSpacing:'.06em',background:'rgba(29,212,160,0.1)',padding:'1px 6px',borderRadius:4}}>AUTO</span>
                        : <button onClick={()=>{setPressureManual(false);setPressureCost(autoPressureCost)}} style={{fontSize:9,color:C.accent,background:'none',border:'none',cursor:'pointer',padding:0,fontWeight:700}}>↺ reset</button>
                      }
                    </div>
                    <input style={{...inp, borderColor: pressureManual ? C.warn : C.border}} type="number" value={pressureCost}
                      onFocus={e => e.target.select()}
                      onChange={e => { setPressureManual(true); setPressureCost(+e.target.value||0) }}/>
                  </div>
                  {/* Нэмэгдэл, НӨАТ */}
                  {[
                    ['Нэмэгдэл (%)', overhead, setOverhead],
                    ['НӨАТ (%)',     vat,      setVat],
                  ].map(([l,v,s]) => (
                    <div key={l}>
                      <label style={lbl}>{l}</label>
                      <input style={inp} type="number" value={v} onFocus={e => e.target.select()} onChange={e => s(+e.target.value||0)}/>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: results */}
            <div className="pro-right" style={{flex:1,overflowY:'auto',padding:'20px 20px'}}>

              {/* Metrics */}
              <div className="metrics-3" style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:18}}>
                {[
                  {l:'Нийт дүн',   v:fmtU(result.total),           sub:`${qty.toLocaleString()} ш`, color:C.accent},
                  {l:'Нэгж өртөг', v:`₮${result.unitCost.toFixed(1)}`, sub:'нэг ширхэг',             color:C.purple},
                  {l:'Үр ашиг',    v:`${result.efficiency.toFixed(1)}%`, sub:`${result.perSheet}ш/хуудас`, color:C.success},
                ].map(m => (
                  <div key={m.l} style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,padding:'14px 16px',position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:m.color}}/>
                    <div style={{fontSize:10,color:C.textMid,marginBottom:5,fontWeight:700,letterSpacing:'.05em',textTransform:'uppercase'}}>{m.l}</div>
                    <div style={{fontSize:26,fontWeight:800,color:m.color,letterSpacing:'-1px',lineHeight:1}}>{m.v}</div>
                    <div style={{fontSize:11,color:C.textDim,marginTop:4}}>{m.sub}</div>
                  </div>
                ))}
              </div>

              {/* Layout + Breakdown */}
              <div className="two-col" style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
                <div style={{...card,marginBottom:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:12}}>Байршуулалтын зураг</div>
                  <LayoutVis cols={result.cols} rows={result.rows} pW={result.pw} pH={result.ph}
                    masterW={MASTER_W} masterH={MASTER_H} margin={marginMm} gap={gapMm}/>
                  <div style={{marginTop:10,fontSize:11,color:C.textMid}}>
                    А0-д {result.cols}×{result.rows} = <strong style={{color:C.text}}>{result.perSheet}ш</strong>
                  </div>
                </div>
                <div style={{...card,marginBottom:0}}>
                  <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:12}}>Зардлын задаргаа</div>
                  {result.breakdown.map(({l,v}) => (
                    <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 0',borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                      <span style={{color:C.textMid}}>{l}</span>
                      <span style={{color:v>0?C.text:C.textDim,fontWeight:600,fontVariantNumeric:'tabular-nums'}}>
                        {v>0 ? `₮${fmt(v)}` : '—'}
                      </span>
                    </div>
                  ))}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:C.accentGlow,border:`1px solid ${C.accentDim}`,borderRadius:9,padding:'10px 13px',marginTop:10}}>
                    <span style={{fontSize:13,color:C.accent,fontWeight:700}}>Нийт дүн</span>
                    <span style={{fontSize:20,color:C.accent,fontWeight:800,fontVariantNumeric:'tabular-nums'}}>₮{fmt(result.total)}</span>
                  </div>
                </div>
              </div>

              {/* Техникийн дэлгэрэнгүй */}
              <div style={card}>
                <div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:12}}>Техникийн дэлгэрэнгүй</div>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                  <tbody>
                    {[
                      ['Бүтээгдэхүүний хэмжээ', `${result.pw}×${result.ph}мм`],
                      ['А0 хуудасны багтаамж',  `${result.cols}×${result.rows} = ${result.perSheet}ш`],
                      ['Дотоод хуудас (А0)',     `${result.innerSheets.toLocaleString()}`],
                      ['Хавтасны хуудас (А0)',   hascover ? `${result.coverSheets.toLocaleString()}` : '—'],
                      ['Номын нуруу',            hascover ? `${result.spineWidth}мм` : '—'],
                      ['Нийт А0 хуудас',         `${result.totalSheets.toLocaleString()}`],
                      ['Нийт цаасны зардал',     `₮${fmt(result.totalPaperCost)}`],
                      ['Офсет хавтан',           printMethod==='offset' ? `₮${fmt(result.plateCost)}` : '—'],
                    ].map(([k,v]) => (
                      <tr key={k} className="calc-row">
                        <td style={{padding:'7px 8px',color:C.textMid,borderBottom:`1px solid ${C.border}`}}>{k}</td>
                        <td style={{padding:'7px 8px',color:C.text,fontWeight:600,textAlign:'right',borderBottom:`1px solid ${C.border}`}}>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Үнийн санал */}
              <div className="price-3" style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:14}}>
                {[0.2,0.3,0.4].map(margin => {
                  const price = result.total*(1+margin)
                  const unit  = qty>0 ? price/qty : 0
                  return (
                    <div key={margin} style={{background:C.surface,borderRadius:10,border:`1px solid ${C.border}`,padding:'14px 16px',textAlign:'center'}}>
                      <div style={{fontSize:10,color:C.textDim,fontWeight:700,marginBottom:5,letterSpacing:'.06em',textTransform:'uppercase'}}>{(margin*100).toFixed(0)}% ашигтай</div>
                      <div style={{fontSize:20,fontWeight:800,color:C.teal,letterSpacing:'-1px'}}>₮{fmt(price)}</div>
                      <div style={{fontSize:11,color:C.textDim,marginTop:3}}>нэгж: ₮{unit.toFixed(1)}</div>
                    </div>
                  )
                })}
              </div>

              {/* Action buttons */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                <button onClick={handlePrint} style={{
                  padding:'13px',background:C.surface,color:C.accent,
                  border:`1.5px solid ${C.accentDim}`,borderRadius:10,fontSize:13,fontWeight:700,
                  cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:7,
                  transition:'opacity .15s',
                }}>
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                    <rect x="6" y="14" width="12" height="8"/>
                  </svg>
                  PDF үнийн санал
                </button>
                <button onClick={() => { setCalcName(''); setSaveModal(true) }} disabled={saving} style={{
                  padding:'13px',background:C.accent,color:'white',border:'none',
                  borderRadius:10,fontSize:13,fontWeight:700,cursor:saving?'not-allowed':'pointer',
                  boxShadow:`0 4px 20px ${C.accentGlow}`,opacity:saving?0.7:1,
                  display:'flex',alignItems:'center',justifyContent:'center',gap:7,
                  transition:'opacity .15s',
                }}>
                  <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                    <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
                  </svg>
                  {saving ? 'Хадгалж байна...' : 'Тооцоо хадгалах'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <FeedbackButton />

      {/* ── SAVE MODAL ── */}
      {saveModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center'}}
          onClick={e => e.target===e.currentTarget && setSaveModal(false)}>
          <div style={{background:'#fff',borderRadius:16,padding:'24px',width:340,boxShadow:'0 24px 60px rgba(0,0,0,0.18)'}}>
            <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:4}}>Тооцоо хадгалах</div>
            <div style={{fontSize:12,color:C.textMid,marginBottom:18}}>Тооцоонд нэр өгнө үү</div>
            <label style={lbl}>Тооцооны нэр</label>
            <input
              autoFocus
              style={{...inp,marginBottom:20}}
              placeholder={`${PRODUCT_TYPES[productType]?.label} — ${new Date().toLocaleDateString('mn-MN')}`}
              value={calcName}
              onChange={e => setCalcName(e.target.value)}
              onKeyDown={e => e.key==='Enter' && saveCalc()}
            />
            <div style={{display:'flex',gap:8}}>
              <button onClick={() => setSaveModal(false)} style={{flex:1,padding:'11px',background:C.bg,color:C.textMid,border:`1.5px solid ${C.border}`,borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer'}}>
                Цуцлах
              </button>
              <button onClick={saveCalc} style={{flex:1,padding:'11px',background:C.accent,color:'white',border:'none',borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',boxShadow:`0 4px 16px ${C.accentGlow}`}}>
                Хадгалах
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function LayoutVis({ cols, rows, pW, pH, masterW, masterH, margin, gap }) {
  const maxW=200, maxH=150
  if (!pW || !pH) return null
  const scale = Math.min(maxW/masterW, maxH/masterH, 1)
  const vw=Math.round(masterW*scale), vh=Math.round(masterH*scale)
  const sm=Math.round(margin*scale)
  const sw=Math.max(1,Math.round(pW*scale)), sh=Math.max(1,Math.round(pH*scale))
  const sg=Math.round(gap*scale)
  const items=[]
  for (let r=0;r<rows;r++)
    for (let c=0;c<cols;c++)
      items.push({x:sm+c*(sw+sg), y:sm+r*(sh+sg), n:r*cols+c+1})
  return (
    <div style={{position:'relative',background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:6,width:vw,height:vh,flexShrink:0}}>
      <div style={{position:'absolute',left:sm,top:sm,right:sm,bottom:sm,border:`1px dashed ${C.borderHover}`,borderRadius:2,pointerEvents:'none'}}/>
      {items.map(({x,y,n}) => (
        <div key={n} style={{position:'absolute',left:x,top:y,width:sw,height:sh,background:C.accentGlow,border:`0.5px solid ${C.accentDim}`,borderRadius:1,display:'flex',alignItems:'center',justifyContent:'center',fontSize:Math.max(5,Math.min(8,sw/3)),color:C.accent,fontWeight:700}}>
          {sw>12&&sh>10 ? n : ''}
        </div>
      ))}
    </div>
  )
}
