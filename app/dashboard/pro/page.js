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
  book:      { label: 'Ном / Дэвтэр',      icon: '📚' },
  blank:     { label: 'Бланк / Сертификат', icon: '📋' },
  sticker:   { label: 'Стикер',            icon: '🏷️' },
  namecard:  { label: 'Нэрийн хуудас',     icon: '💳' },
  packaging: { label: 'Сав баглаа',         icon: '📦' },
}

const PAPER_SIZES = {
  'А0':[841,1189],'А1':[594,841],'А2':[420,594],
  'А3':[297,420], 'А4':[210,297],'А5':[148,210],
  'В3':[353,500], 'В4':[250,353],'В5':[176,250],
  '210х75':[210,75],'99х210':[99,210],'Дурын':null,
}

const PAPER_WEIGHTS = [48,70,80,100,105,115,120,128,150,157,200,250,300]

const PAPER_PRICES = {
  48:210, 70:318, 80:336, 100:500, 105:630,
  115:700, 120:830, 128:770, 150:890, 157:950,
  200:1200, 250:1500, 300:1900,
}

const PAPER_THICKNESS = {
  48:.05, 70:.07, 80:.09, 100:.11, 105:.12,
  115:.13, 120:.14, 128:.14, 150:.17, 157:.18,
  200:.22, 250:.28, 300:.33,
}

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
  { id:'1+0', label:'1+0', desc:'Нэг тал · хар/цагаан',   plates:1 },
  { id:'1+1', label:'1+1', desc:'Хоёр тал · хар/цагаан',  plates:2 },
  { id:'4+0', label:'4+0', desc:'Нэг тал · бүтэн өнгө',   plates:4 },
  { id:'4+4', label:'4+4', desc:'Хоёр тал · бүтэн өнгө',  plates:8 },
]

const MASTER_W = 889, MASTER_H = 1194

const PRODUCT_DEFAULTS = {
  poster:    { pages:1,  printMethod:'offset',  paperSize:'А3',     paperWeight:157, colorOption:'4+0', hascover:false },
  brochure:  { pages:4,  printMethod:'offset',  paperSize:'А4',     paperWeight:157, colorOption:'4+4', hascover:false },
  magazine:  { pages:32, printMethod:'offset',  paperSize:'А4',     paperWeight:90,  colorOption:'4+4', hascover:true, coverWeight:300 },
  calendar:  { pages:12, printMethod:'offset',  paperSize:'А3',     paperWeight:150, colorOption:'4+0', hascover:false },
  newspaper: { pages:8,  printMethod:'offset',  paperSize:'А3',     paperWeight:57,  colorOption:'1+0', hascover:false },
  book:      { pages:96, printMethod:'offset',  paperSize:'А5',     paperWeight:80,  colorOption:'1+0', hascover:true, coverWeight:250 },
  blank:     { pages:1,  printMethod:'offset',  paperSize:'А4',     paperWeight:80,  colorOption:'1+0', hascover:false },
  sticker:   { pages:1,  printMethod:'digital', paperSize:'А4',     paperWeight:80,  colorOption:'4+0', hascover:false },
  namecard:  { pages:2,  printMethod:'offset',  paperSize:'99х210', paperWeight:300, colorOption:'4+4', hascover:false },
  packaging: { pages:1,  printMethod:'offset',  paperSize:'Дурын',  paperWeight:200, colorOption:'4+0', hascover:false },
}

const STEPS = [
  { n:1, label:'Бүтээгдэхүүн' },
  { n:2, label:'Цаас' },
  { n:3, label:'Өнгө' },
  { n:4, label:'Боловсруулалт' },
  { n:5, label:'Үр дүн' },
]

const C = {
  bg:'#f4f6fb', surface:'#ffffff', surfaceHover:'#f8faff',
  border:'#e2e8f3', borderHover:'#c5d0e8',
  accent:'#4f7cff', accentDim:'#3563e9', accentGlow:'rgba(79,124,255,0.10)',
  success:'#10b981', warn:'#f59e0b', danger:'#ef4444',
  text:'#111827', textMid:'#4b5a7a', textDim:'#9aa5bf',
  purple:'#7c3aed', teal:'#0d9488', sidebar:'#ffffff',
}

const inp = {
  width:'100%', padding:'9px 12px', fontSize:13, fontWeight:500,
  border:`1.5px solid ${C.border}`, borderRadius:8, background:'#ffffff',
  color:C.text, outline:'none', boxSizing:'border-box', transition:'border-color .15s',
}
const lbl = {
  display:'block', fontSize:10, fontWeight:700, color:C.textMid,
  marginBottom:5, letterSpacing:'.08em', textTransform:'uppercase',
}

export default function ProCalculator() {
  const router = useRouter()
  const [user, setUser]         = useState(null)
  const [profile, setProfile]   = useState(null)
  const [activeSection, setActiveSection] = useState('calc')
  const [history, setHistory]   = useState([])
  const [saving, setSaving]     = useState(false)
  const [saveModal, setSaveModal] = useState(false)
  const [calcName,  setCalcName]  = useState('')
  const [step, setStep]           = useState(1)
  const [showAdvanced, setShowAdvanced] = useState(false)

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
  const [setupCost,      setSetupCost]      = useState(50000)
  const [pressureCost,   setPressureCost]   = useState(40000)
  const [setupManual,    setSetupManual]    = useState(false)
  const [pressureManual, setPressureManual] = useState(false)
  const [overhead,       setOverhead]       = useState(20)
  const [vat,            setVat]            = useState(10)
  const [postProc,    setPostProc]    = useState({
    coating:0, tigel:0, lacquer:0, mix:0, fold:0, glue:0, stitch:0, cut:20000,
  })
  const [postEnabled, setPostEnabled] = useState({
    coating:false, tigel:false, lacquer:false, mix:false,
    fold:false, glue:false, stitch:false, cut:true,
  })

  // ── AUTO SETUP COST ──────────────────────────────────────────────────────
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
    return (base[printMethod]?.[colorOption] ?? 50000) + (adj[productType] ?? 0)
  }, [printMethod, colorOption, productType])

  // ── AUTO PRESSURE COST ───────────────────────────────────────────────────
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
      .from('calculations').select('*')
      .eq('user_id', uid).order('created_at', { ascending: false }).limit(30)
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

  // ── PRODUCT AUTO-FILL ────────────────────────────────────────────────────
  function applyProductType(type) {
    const d = PRODUCT_DEFAULTS[type]
    if (!d) return
    setProductType(type)
    setPages(d.pages)
    setPrintMethod(d.printMethod)
    setPaperSize(d.paperSize)
    setPaperWeight(d.paperWeight)
    setColorOption(d.colorOption)
    setHascover(d.hascover)
    if (d.coverWeight) setCoverWeight(d.coverWeight)
    setSetupManual(false)
    setPressureManual(false)
  }

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
        .co{font-size:20px;font-weight:800}.dt{font-size:12px;color:#64748b;margin-top:3px}.dn{font-size:11px;color:#94a3b8;margin-top:2px}
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

  // ── RESULT CALCULATION ───────────────────────────────────────────────────
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

    const plateCost = printMethod === 'offset' ? (PLATE_COUNT[colorOption] || 4) * 3850 : 0

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
      pw, ph, cols, rows, perSheet, pagesPerSheet, sidesPerSheet,
      innerSheets, coverSheets, totalSheets, spineWidth,
      totalPaperCost, plateCost, pressureTotal, postTotal,
      setupCost, overheadAmt, vatAmt, total, unitCost, efficiency,
      breakdown: [
        { l:'Цаасны зардал',        v:totalPaperCost },
        { l:'Ажиллагааны үнэ',      v:setupCost },
        { l:'Өнгөний хавтан',       v:plateCost },
        { l:'Даралтын зардал',      v:pressureTotal },
        { l:'Боловсруулалт',        v:postTotal },
        { l:`Нэмэгдэл ${overhead}%`, v:overheadAmt },
        { l:`НӨАТ ${vat}%`,         v:vatAmt },
      ],
    }
  }, [productType, printMethod, qty, paperSize, customW, customH, paperWeight,
      colorOption, pages, hascover, coverWeight, orient, marginMm, gapMm,
      setupCost, pressureCost, overhead, vat, postProc])

  const fmt  = n => Math.round(n).toLocaleString()
  const fmtU = n => n >= 1000000 ? `₮${(n/1000000).toFixed(1)}сая` : `₮${fmt(n)}`
  const initials = (profile?.company_name || user?.email || '?').slice(0,2).toUpperCase()

  if (!user) return (
    <div style={{minHeight:'100vh',background:C.bg,display:'flex',alignItems:'center',
      justifyContent:'center',color:C.textMid,fontFamily:'system-ui,sans-serif',fontSize:14}}>
      Ачааллаж байна...
    </div>
  )

  // ── NAV HELPERS ──────────────────────────────────────────────────────────
  function goToCalc() { setActiveSection('calc'); setStep(1) }
  function resetCalc() {
    applyProductType('brochure')
    setQty(500)
    setOverhead(20); setVat(10)
    setSetupManual(false); setPressureManual(false)
    setPostProc({ coating:0,tigel:0,lacquer:0,mix:0,fold:0,glue:0,stitch:0,cut:20000 })
    setPostEnabled({ coating:false,tigel:false,lacquer:false,mix:false,fold:false,glue:false,stitch:false,cut:true })
    setStep(1)
  }

  return (
    <div style={{display:'flex',minHeight:'100vh',background:C.bg,
      fontFamily:"'DM Sans','Helvetica Neue',sans-serif",color:C.text}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box}
        input:focus,select:focus{border-color:${C.accent}!important;outline:none}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:${C.border};border-radius:10px}
        .ptype-btn:hover{border-color:${C.accent}!important;background:${C.accentGlow}!important}
        .sb-btn:hover{background:${C.accentGlow}!important;color:${C.accent}!important}
        .col-card:hover{border-color:${C.accent}!important}
        .post-tog:hover{border-color:${C.accent}!important}
        .qty-chip:hover{background:${C.accent}!important;color:#fff!important;border-color:${C.accent}!important}
        .hist-row:hover{border-color:${C.borderHover}!important}
        .nav-btn{cursor:pointer;border:none;transition:all .15s}
        .nav-btn:hover{opacity:.85}
      `}</style>

      {/* ── SIDEBAR ─────────────────────────────────────────────────────── */}
      <div style={{width:210,background:C.sidebar,borderRight:`1.5px solid ${C.border}`,
        boxShadow:'2px 0 12px rgba(0,0,0,0.04)',display:'flex',flexDirection:'column',
        position:'fixed',top:0,left:0,bottom:0,zIndex:10}}>

        <div style={{display:'flex',alignItems:'center',gap:9,padding:'18px 16px 20px',
          borderBottom:`1px solid ${C.border}`}}>
          <svg width="30" height="30" viewBox="0 0 75 80" fill="none" style={{flexShrink:0}}>
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
          <div style={{fontSize:13,fontWeight:700,color:C.text}}>PrintCalc</div>
        </div>

        <div style={{padding:'10px 8px',flex:1}}>
          {[
            { id:'calc',    label:'Тооцоо',   icon:<path d="M9 7h6M9 12h6M9 17h4"/>, onClick: goToCalc },
            { id:'history', label:'Түүх',     icon:<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>, onClick: () => setActiveSection('history') },
          ].map(t => (
            <button key={t.id} className="sb-btn" onClick={t.onClick} style={{
              display:'flex',alignItems:'center',gap:8,padding:'8px 10px',width:'100%',
              background: activeSection===t.id && (t.id==='history' || step>=1) ? C.accentGlow : 'none',
              color: activeSection===t.id ? C.accent : C.textMid,
              border:'none',borderRadius:8,cursor:'pointer',fontSize:12,
              fontWeight: activeSection===t.id ? 700 : 500,marginBottom:2,textAlign:'left',
            }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">{t.icon}</svg>
              {t.label}
            </button>
          ))}

          <div style={{height:12,borderTop:`1px solid ${C.border}`,margin:'8px 0'}}/>
          <button className="sb-btn" onClick={() => router.push('/profile')} style={{
            display:'flex',alignItems:'center',gap:8,padding:'8px 10px',width:'100%',
            background:'none',color:C.textMid,border:'none',borderRadius:8,cursor:'pointer',
            fontSize:12,fontWeight:500,textAlign:'left',
          }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
            Профайл
          </button>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:8,padding:'12px 14px',
          borderTop:`1px solid ${C.border}`}}>
          <div style={{width:28,height:28,borderRadius:'50%',background:C.accentDim,
            display:'flex',alignItems:'center',justifyContent:'center',
            color:'white',fontSize:10,fontWeight:700,flexShrink:0,overflow:'hidden'}}>
            {profile?.logo_url
              ? <img src={profile.logo_url} alt="logo" style={{width:28,height:28,objectFit:'cover'}}/>
              : initials}
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:11,fontWeight:600,color:C.textMid,
              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {profile?.company_name || 'Компани'}
            </div>
            <div style={{fontSize:9,color:C.textDim,
              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {user.email?.slice(0,22)}
            </div>
          </div>
          <button onClick={handleLogout} title="Гарах" style={{
            background:'none',border:'none',cursor:'pointer',color:C.textDim,padding:4,flexShrink:0}}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── MAIN ────────────────────────────────────────────────────────── */}
      <div style={{marginLeft:210,flex:1,minHeight:'100vh',overflowY:'auto'}}>

        {/* ─── HISTORY ─── */}
        {activeSection === 'history' && (
          <div style={{padding:'28px 32px',maxWidth:760,margin:'0 auto'}}>
            <div style={{marginBottom:24}}>
              <div style={{fontSize:18,fontWeight:800,letterSpacing:'-.4px'}}>Тооцооны түүх</div>
              <div style={{fontSize:12,color:C.textMid,marginTop:3}}>Хадгалагдсан бүх тооцоо</div>
            </div>
            {history.length === 0 ? (
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',
                padding:'80px 20px',gap:12,color:C.textMid,textAlign:'center'}}>
                <div style={{fontSize:40}}>📋</div>
                <p style={{fontSize:14}}>Хадгалагдсан тооцоо байхгүй байна</p>
                <button onClick={goToCalc} style={{
                  padding:'9px 20px',background:C.accent,color:'white',border:'none',
                  borderRadius:8,fontSize:13,fontWeight:600,cursor:'pointer',marginTop:8}}>
                  Тооцоо хийх →
                </button>
              </div>
            ) : history.map(h => (
              <div key={h.id} className="hist-row" style={{
                background:C.surface,border:`1px solid ${C.border}`,borderRadius:10,
                padding:'14px 16px',marginBottom:10,transition:'border-color .15s'}}>
                <div style={{display:'flex',justifyContent:'space-between',
                  alignItems:'flex-start',marginBottom:8}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:C.text}}>
                      {h.name || `${h.paper_size} / ${h.material_w}×${h.material_h}мм`}
                    </div>
                    <div style={{fontSize:11,color:C.textDim,marginTop:3}}>
                      {h.paper_size} · {new Date(h.created_at).toLocaleDateString('mn-MN')}
                    </div>
                  </div>
                  <span style={{fontSize:16,fontWeight:800,color:C.accent}}>
                    ₮{h.total?.toLocaleString()}
                  </span>
                </div>
                <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                  {[`${h.qty?.toLocaleString()} ш`,`${h.per_sheet} ш/хуудас`,`${h.efficiency}% үр ашиг`]
                    .map(tag => (
                    <span key={tag} style={{fontSize:11,color:C.textMid,background:C.bg,
                      padding:'2px 9px',borderRadius:20,border:`1px solid ${C.border}`}}>{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── WIZARD ─── */}
        {activeSection === 'calc' && (
          <div style={{padding:'28px 32px',maxWidth:720,margin:'0 auto'}}>

            {/* Step indicator */}
            <div style={{display:'flex',alignItems:'center',marginBottom:32}}>
              {STEPS.map((s, i) => (
                <div key={s.n} style={{display:'flex',alignItems:'center',flex:i<STEPS.length-1?1:'none'}}>
                  <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
                    <div style={{
                      width:32,height:32,borderRadius:'50%',display:'flex',
                      alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,
                      transition:'all .2s',
                      background: step>s.n ? C.accent : step===s.n ? C.accent : C.surface,
                      color:       step>=s.n ? 'white' : C.textDim,
                      border:`2px solid ${step>=s.n ? C.accent : C.border}`,
                    }}>
                      {step > s.n
                        ? <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                        : s.n}
                    </div>
                    <div style={{fontSize:9,fontWeight:700,letterSpacing:'.05em',
                      textTransform:'uppercase',color:step===s.n?C.accent:C.textDim,
                      whiteSpace:'nowrap'}}>
                      {s.label}
                    </div>
                  </div>
                  {i < STEPS.length-1 && (
                    <div style={{flex:1,height:2,background:step>s.n?C.accent:C.border,
                      margin:'0 6px',marginBottom:18,transition:'background .2s'}}/>
                  )}
                </div>
              ))}
            </div>

            {/* ═══ STEP 1 — Бүтээгдэхүүн ════════════════════════════════ */}
            {step === 1 && (
              <div>
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:20,fontWeight:800,letterSpacing:'-.4px'}}>
                    Ямар бүтээгдэхүүн хэвлэх вэ?
                  </div>
                  <div style={{fontSize:13,color:C.textMid,marginTop:4}}>
                    Сонгоход цаас, өнгө, нүүр тоо автоматаар бөглөгдөнө
                  </div>
                </div>

                {/* Product grid */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:8,marginBottom:24}}>
                  {Object.entries(PRODUCT_TYPES).map(([k,v]) => (
                    <button key={k} className="ptype-btn" onClick={() => applyProductType(k)} style={{
                      display:'flex',flexDirection:'column',alignItems:'center',gap:6,
                      padding:'14px 8px',
                      background: productType===k ? C.accentGlow : C.surface,
                      border:`2px solid ${productType===k ? C.accent : C.border}`,
                      borderRadius:10,cursor:'pointer',transition:'all .15s',
                      color: productType===k ? C.accent : C.textMid,
                    }}>
                      <span style={{fontSize:22}}>{v.icon}</span>
                      <span style={{fontSize:10,fontWeight:700,textAlign:'center',lineHeight:1.3}}>
                        {v.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Size */}
                <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,
                  padding:'20px 22px',marginBottom:14}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.textMid,letterSpacing:'.08em',
                    textTransform:'uppercase',marginBottom:12}}>Бүтээгдэхүүний хэмжээ</div>

                  {/* Dimension inputs — always visible */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                    <div>
                      <label style={lbl}>Өргөн (мм)</label>
                      <input
                        style={{...inp,
                          fontWeight:700,fontSize:15,
                          background: paperSize!=='Дурын' ? C.bg : '#fff',
                          color: paperSize!=='Дурын' ? C.textMid : C.text,
                        }}
                        type="number"
                        value={paperSize==='Дурын' ? customW : result.pw}
                        onFocus={e => e.target.select()}
                        readOnly={paperSize!=='Дурын'}
                        onChange={e => {
                          if (paperSize==='Дурын') setCustomW(+e.target.value||0)
                        }}
                      />
                    </div>
                    <div>
                      <label style={lbl}>Өндөр (мм)</label>
                      <input
                        style={{...inp,
                          fontWeight:700,fontSize:15,
                          background: paperSize!=='Дурын' ? C.bg : '#fff',
                          color: paperSize!=='Дурын' ? C.textMid : C.text,
                        }}
                        type="number"
                        value={paperSize==='Дурын' ? customH : result.ph}
                        onFocus={e => e.target.select()}
                        readOnly={paperSize!=='Дурын'}
                        onChange={e => {
                          if (paperSize==='Дурын') setCustomH(+e.target.value||0)
                        }}
                      />
                    </div>
                  </div>

                  {/* Size preset + orientation */}
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                    <div>
                      <label style={lbl}>Урьдчилсан хэмжээ</label>
                      <select style={inp} value={paperSize} onChange={e => setPaperSize(e.target.value)}>
                        {Object.keys(PAPER_SIZES).map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Чиглэл</label>
                      <div style={{display:'flex',borderRadius:8,border:`1.5px solid ${C.border}`,overflow:'hidden'}}>
                        {[['portrait','↕ Босоо'],['landscape','↔ Хэвтээ']].map(([o,l]) => (
                          <button key={o} onClick={() => setOrient(o)} style={{
                            flex:1,padding:'9px 4px',fontSize:11,fontWeight:600,border:'none',
                            background:orient===o?C.accentGlow:'#fff',
                            color:orient===o?C.accent:C.textMid,cursor:'pointer',
                          }}>{l}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {paperSize!=='Дурын' && (
                    <div style={{fontSize:11,color:C.textDim,marginBottom:10}}>
                      💡 Өөр хэмжээ оруулахыг хүсвэл <strong style={{color:C.accent,cursor:'pointer'}}
                        onClick={() => setPaperSize('Дурын')}>Дурын</strong> сонгоно уу
                    </div>
                  )}

                  {result.perSheet > 0 && (
                    <div style={{background:C.accentGlow,borderRadius:8,padding:'8px 12px',
                      display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span style={{fontSize:11,color:C.accent,fontWeight:600}}>
                        Нэг мастер хуудаст багтах
                      </span>
                      <span style={{fontSize:14,fontWeight:800,color:C.accent}}>
                        {result.cols}×{result.rows} = {result.perSheet} ш
                      </span>
                    </div>
                  )}
                </div>

                {/* Quantity */}
                <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,
                  padding:'20px 22px',marginBottom:14}}>
                  <label style={lbl}>Нийт ширхэг</label>
                  <input style={{...inp,fontSize:18,fontWeight:700,padding:'11px 14px',marginBottom:12}}
                    type="number" value={qty} onFocus={e => e.target.select()}
                    onChange={e => setQty(+e.target.value||0)}/>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                    {[100,250,500,1000,2500,5000].map(n => (
                      <button key={n} className="qty-chip" onClick={() => setQty(n)} style={{
                        padding:'5px 14px',fontSize:12,fontWeight:600,
                        background: qty===n ? C.accent : C.bg,
                        color: qty===n ? '#fff' : C.textMid,
                        border:`1.5px solid ${qty===n ? C.accent : C.border}`,
                        borderRadius:20,cursor:'pointer',transition:'all .15s',
                      }}>{n.toLocaleString()}</button>
                    ))}
                  </div>
                </div>

                {/* Pages + cover */}
                <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,
                  padding:'20px 22px',marginBottom:24}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
                    <div>
                      <label style={lbl}>Нийт нүүрийн тоо</label>
                      <input style={inp} type="number" value={pages}
                        onFocus={e => e.target.select()}
                        onChange={e => setPages(+e.target.value||1)}/>
                    </div>
                    <div style={{display:'flex',flexDirection:'column',justifyContent:'flex-end'}}>
                      <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',
                        fontSize:13,color:C.textMid,paddingBottom:9}}>
                        <input type="checkbox" checked={hascover}
                          onChange={e => setHascover(e.target.checked)}
                          style={{accentColor:C.accent,width:16,height:16}}/>
                        <span>Тусдаа хавтас нэмэх</span>
                      </label>
                    </div>
                  </div>
                  {/* Auto-fill hint */}
                  <div style={{fontSize:11,color:C.textDim,background:C.bg,borderRadius:7,
                    padding:'8px 12px',display:'flex',alignItems:'center',gap:6}}>
                    <span>💡</span>
                    <span>
                      <strong style={{color:C.accent}}>
                        {PRODUCT_TYPES[productType]?.label}
                      </strong>
                      {' '}сонгосон: {PRODUCT_DEFAULTS[productType]?.printMethod==='offset'?'Офсет':'Дижитал'},
                      {' '}{PRODUCT_DEFAULTS[productType]?.paperSize},
                      {' '}{PRODUCT_DEFAULTS[productType]?.colorOption} өнгө
                    </span>
                  </div>
                </div>

                <div style={{display:'flex',justifyContent:'flex-end'}}>
                  <button className="nav-btn" onClick={() => setStep(2)} style={{
                    padding:'12px 28px',background:C.accent,color:'white',
                    borderRadius:10,fontSize:14,fontWeight:700,
                    boxShadow:`0 4px 16px ${C.accentGlow}`,
                  }}>
                    Цааш → Цаасны мэдээлэл
                  </button>
                </div>
              </div>
            )}

            {/* ═══ STEP 2 — Цаас ════════════════════════════════════════ */}
            {step === 2 && (
              <div>
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:20,fontWeight:800,letterSpacing:'-.4px'}}>Цаасны мэдээлэл</div>
                  <div style={{fontSize:13,color:C.textMid,marginTop:4}}>
                    Хэвлэх арга болон цаасны параметрүүдийг тохируулна уу
                  </div>
                </div>

                {/* Print method */}
                <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,
                  padding:'20px 22px',marginBottom:14}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.textMid,letterSpacing:'.08em',
                    textTransform:'uppercase',marginBottom:12}}>Хэвлэх арга</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                    {[
                      { id:'offset',  label:'Офсет',   desc:'Том хэмжээний хэвлэл', icon:'🖨️' },
                      { id:'digital', label:'Дижитал', desc:'Жижиг тираж, хурдан',   icon:'💻' },
                    ].map(m => (
                      <button key={m.id} onClick={() => setPrintMethod(m.id)} style={{
                        padding:'16px',textAlign:'left',
                        background: printMethod===m.id ? C.accentGlow : C.bg,
                        border:`2px solid ${printMethod===m.id ? C.accent : C.border}`,
                        borderRadius:10,cursor:'pointer',transition:'all .15s',
                      }}>
                        <div style={{fontSize:20,marginBottom:6}}>{m.icon}</div>
                        <div style={{fontSize:14,fontWeight:700,
                          color:printMethod===m.id?C.accent:C.text}}>{m.label}</div>
                        <div style={{fontSize:11,color:C.textDim,marginTop:3}}>{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Size + orientation */}
                <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,
                  padding:'20px 22px',marginBottom:14}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.textMid,letterSpacing:'.08em',
                    textTransform:'uppercase',marginBottom:12}}>Хэмжээ & Чиглэл</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                    <div>
                      <label style={lbl}>Цаасны хэмжээ</label>
                      <select style={inp} value={paperSize}
                        onChange={e => setPaperSize(e.target.value)}>
                        {Object.keys(PAPER_SIZES).map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Чиглэл</label>
                      <div style={{display:'flex',borderRadius:8,border:`1.5px solid ${C.border}`,overflow:'hidden'}}>
                        {[['portrait','↕ Босоо'],['landscape','↔ Хэвтээ']].map(([o,l]) => (
                          <button key={o} onClick={() => setOrient(o)} style={{
                            flex:1,padding:'9px 4px',fontSize:11,fontWeight:600,border:'none',
                            background:orient===o?C.accentGlow:'#fff',
                            color:orient===o?C.accent:C.textMid,cursor:'pointer',
                          }}>{l}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  {paperSize === 'Дурын' && (
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                      <div>
                        <label style={lbl}>Өргөн (мм)</label>
                        <input style={inp} type="number" value={customW}
                          onFocus={e => e.target.select()} onChange={e => setCustomW(+e.target.value||0)}/>
                      </div>
                      <div>
                        <label style={lbl}>Өндөр (мм)</label>
                        <input style={inp} type="number" value={customH}
                          onFocus={e => e.target.select()} onChange={e => setCustomH(+e.target.value||0)}/>
                      </div>
                    </div>
                  )}
                  {/* Size info */}
                  {result.perSheet > 0 && (
                    <div style={{background:C.accentGlow,borderRadius:8,padding:'10px 14px',
                      display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                      <span style={{fontSize:12,color:C.accent,fontWeight:600}}>
                        Нэг мастер хуудасны багтаамж
                      </span>
                      <span style={{fontSize:16,fontWeight:800,color:C.accent}}>
                        {result.cols}×{result.rows} = {result.perSheet} ш
                      </span>
                    </div>
                  )}
                </div>

                {/* Paper weight */}
                <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,
                  padding:'20px 22px',marginBottom:14}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.textMid,letterSpacing:'.08em',
                    textTransform:'uppercase',marginBottom:12}}>Цаасны жин</div>
                  <select style={{...inp,marginBottom:10}} value={paperWeight}
                    onChange={e => setPaperWeight(+e.target.value)}>
                    {PAPER_WEIGHTS.map(w => (
                      <option key={w} value={w}>{w} гр/м² — A0 ₮{PAPER_PRICES[w]?.toLocaleString()}</option>
                    ))}
                  </select>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    <div style={{background:C.bg,borderRadius:8,padding:'10px 12px'}}>
                      <div style={{fontSize:10,color:C.textDim,fontWeight:600,marginBottom:3}}>A0 үнэ</div>
                      <div style={{fontSize:15,fontWeight:800,color:C.text}}>
                        ₮{PAPER_PRICES[paperWeight]?.toLocaleString()}
                      </div>
                    </div>
                    <div style={{background:C.bg,borderRadius:8,padding:'10px 12px'}}>
                      <div style={{fontSize:10,color:C.textDim,fontWeight:600,marginBottom:3}}>Мастер ≈</div>
                      <div style={{fontSize:15,fontWeight:800,color:C.text}}>
                        ₮{Math.round((PAPER_PRICES[paperWeight]||950) * MASTER_W * MASTER_H / A0_AREA).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Cover */}
                  <div style={{marginTop:14,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
                    <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',
                      fontSize:12,color:C.textMid,marginBottom:hascover?12:0}}>
                      <input type="checkbox" checked={hascover}
                        onChange={e => setHascover(e.target.checked)}
                        style={{accentColor:C.accent,width:15,height:15}}/>
                      Тусдаа хавтас нэмэх
                    </label>
                    {hascover && (
                      <div>
                        <label style={lbl}>Хавтасны цаасны жин (гр/м²)</label>
                        <select style={inp} value={coverWeight}
                          onChange={e => setCoverWeight(+e.target.value)}>
                          {PAPER_WEIGHTS.map(w => (
                            <option key={w} value={w}>
                              {w} гр/м² — A0 ₮{PAPER_PRICES[w]?.toLocaleString()}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Advanced */}
                <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,
                  padding:'14px 22px',marginBottom:24}}>
                  <button onClick={() => setShowAdvanced(v => !v)} style={{
                    display:'flex',alignItems:'center',justifyContent:'space-between',
                    width:'100%',background:'none',border:'none',cursor:'pointer',
                    fontSize:12,fontWeight:700,color:C.textMid,padding:0,
                  }}>
                    <span>⚙️ Дэвшилтэт тохиргоо (зай, ирмэг)</span>
                    <span style={{transition:'transform .2s',
                      transform:showAdvanced?'rotate(180deg)':'none'}}>▾</span>
                  </button>
                  {showAdvanced && (
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:14}}>
                      <div>
                        <label style={lbl}>Ирмэгийн зай (мм)</label>
                        <input style={inp} type="number" value={marginMm}
                          onFocus={e => e.target.select()}
                          onChange={e => setMarginMm(+e.target.value||0)}/>
                      </div>
                      <div>
                        <label style={lbl}>Хуудас хоорондын зай (мм)</label>
                        <input style={inp} type="number" value={gapMm}
                          onFocus={e => e.target.select()}
                          onChange={e => setGapMm(+e.target.value||0)}/>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{display:'flex',gap:10}}>
                  <button className="nav-btn" onClick={() => setStep(1)} style={{
                    padding:'12px 22px',background:C.surface,color:C.textMid,
                    border:`1.5px solid ${C.border}`,borderRadius:10,fontSize:14,fontWeight:600,
                  }}>
                    ← Буцах
                  </button>
                  <button className="nav-btn" onClick={() => setStep(3)} style={{
                    flex:1,padding:'12px 28px',background:C.accent,color:'white',
                    borderRadius:10,fontSize:14,fontWeight:700,
                    boxShadow:`0 4px 16px ${C.accentGlow}`,
                  }}>
                    Цааш → Өнгийн сонголт
                  </button>
                </div>
              </div>
            )}

            {/* ═══ STEP 3 — Өнгө ════════════════════════════════════════ */}
            {step === 3 && (
              <div>
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:20,fontWeight:800,letterSpacing:'-.4px'}}>Өнгийн сонголт</div>
                  <div style={{fontSize:13,color:C.textMid,marginTop:4}}>
                    Өнгийн сонголтоос хамааран ажиллагаа, хавтан, даралтын зардал автоматаар тооцогдоно
                  </div>
                </div>

                {/* Color cards */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:20}}>
                  {COLOR_OPTIONS.map(o => (
                    <button key={o.id} className="col-card" onClick={() => setColorOption(o.id)} style={{
                      padding:'18px',textAlign:'left',
                      background: colorOption===o.id ? C.accentGlow : C.surface,
                      border:`2px solid ${colorOption===o.id ? C.accent : C.border}`,
                      borderRadius:12,cursor:'pointer',transition:'all .15s',
                    }}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                        marginBottom:8}}>
                        <div style={{fontSize:22,fontWeight:900,
                          color:colorOption===o.id?C.accent:C.text}}>{o.label}</div>
                        {colorOption===o.id && (
                          <div style={{width:20,height:20,borderRadius:'50%',background:C.accent,
                            display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <svg width="10" height="10" fill="none" viewBox="0 0 24 24"
                              stroke="white" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          </div>
                        )}
                      </div>
                      <div style={{fontSize:12,color:colorOption===o.id?C.accent:C.textMid,
                        fontWeight:500,marginBottom:6}}>{o.desc}</div>
                      <div style={{fontSize:11,color:C.textDim}}>
                        {o.plates} хавтан × ₮3,850 = ₮{(o.plates*3850).toLocaleString()}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Auto costs */}
                <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,
                  padding:'20px 22px',marginBottom:14}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.textMid,letterSpacing:'.08em',
                    textTransform:'uppercase',marginBottom:16}}>
                    ⚡ Автомат тооцоологдсон зардлууд
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    {/* Setup cost */}
                    <div>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                        marginBottom:5}}>
                        <label style={{...lbl,marginBottom:0}}>Ажиллагааны үнэ (₮)</label>
                        {!setupManual
                          ? <span style={{fontSize:9,color:C.success,fontWeight:700,
                              background:'rgba(16,185,129,0.1)',padding:'2px 7px',borderRadius:4}}>
                              АВТО
                            </span>
                          : <button onClick={()=>{setSetupManual(false);setSetupCost(autoSetupCost)}} style={{
                              fontSize:9,color:C.accent,background:'none',border:'none',
                              cursor:'pointer',padding:0,fontWeight:700}}>↺ болгох</button>
                        }
                      </div>
                      <input
                        style={{...inp, borderColor: setupManual ? C.warn : C.border}}
                        type="number" value={setupCost} onFocus={e => e.target.select()}
                        onChange={e => { setSetupManual(true); setSetupCost(+e.target.value||0) }}/>
                    </div>
                    {/* Pressure cost */}
                    <div>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                        marginBottom:5}}>
                        <label style={{...lbl,marginBottom:0}}>1000 дарлалт (₮)</label>
                        {!pressureManual
                          ? <span style={{fontSize:9,color:C.success,fontWeight:700,
                              background:'rgba(16,185,129,0.1)',padding:'2px 7px',borderRadius:4}}>
                              АВТО
                            </span>
                          : <button onClick={()=>{setPressureManual(false);setPressureCost(autoPressureCost)}} style={{
                              fontSize:9,color:C.accent,background:'none',border:'none',
                              cursor:'pointer',padding:0,fontWeight:700}}>↺ болгох</button>
                        }
                      </div>
                      <input
                        style={{...inp, borderColor: pressureManual ? C.warn : C.border}}
                        type="number" value={pressureCost} onFocus={e => e.target.select()}
                        onChange={e => { setPressureManual(true); setPressureCost(+e.target.value||0) }}/>
                    </div>
                  </div>
                </div>

                {/* Plate info */}
                {printMethod === 'offset' && (
                  <div style={{background:C.bg,borderRadius:10,padding:'14px 16px',
                    marginBottom:24,border:`1px solid ${C.border}`}}>
                    <div style={{fontSize:12,color:C.textMid,marginBottom:6,fontWeight:600}}>
                      Офсет хавтангийн тооцоо
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
                      <span style={{fontSize:12,color:C.text}}>
                        {PLATE_COUNT[colorOption]} хавтан × ₮3,850 ×&nbsp;
                      </span>
                      <span style={{fontSize:12,fontWeight:700,color:C.accent}}>
                        {result.innerForms + result.coverForms} форм
                      </span>
                      <span style={{fontSize:12,color:C.text}}>=</span>
                      <span style={{fontSize:14,fontWeight:800,color:C.accent}}>
                        ₮{fmt(result.plateCost)}
                      </span>
                      {result.innerForms > 1 && (
                        <span style={{fontSize:10,color:C.textDim,background:C.surface,
                          padding:'2px 8px',borderRadius:4,border:`1px solid ${C.border}`}}>
                          {pages} нүүр → {result.innerForms} форм
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div style={{display:'flex',gap:10}}>
                  <button className="nav-btn" onClick={() => setStep(2)} style={{
                    padding:'12px 22px',background:C.surface,color:C.textMid,
                    border:`1.5px solid ${C.border}`,borderRadius:10,fontSize:14,fontWeight:600,
                  }}>
                    ← Буцах
                  </button>
                  <button className="nav-btn" onClick={() => setStep(4)} style={{
                    flex:1,padding:'12px 28px',background:C.accent,color:'white',
                    borderRadius:10,fontSize:14,fontWeight:700,
                    boxShadow:`0 4px 16px ${C.accentGlow}`,
                  }}>
                    Цааш → Боловсруулалт
                  </button>
                </div>
              </div>
            )}

            {/* ═══ STEP 4 — Боловсруулалт ═══════════════════════════════ */}
            {step === 4 && (
              <div>
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:20,fontWeight:800,letterSpacing:'-.4px'}}>
                    Хэвлэлийн дараах боловсруулалт
                  </div>
                  <div style={{fontSize:13,color:C.textMid,marginTop:4}}>
                    Шаардлагатай боловсруулалтуудыг нэмнэ үү
                  </div>
                </div>

                {/* Post-process toggles */}
                <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,
                  padding:'20px 22px',marginBottom:14}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:16}}>
                    {POST_PROCESS.map(p => (
                      <button key={p.id} className="post-tog" onClick={() => togglePost(p.id)} style={{
                        display:'flex',alignItems:'center',justifyContent:'space-between',
                        padding:'10px 14px',
                        background: postEnabled[p.id] ? C.accentGlow : C.bg,
                        border:`1.5px solid ${postEnabled[p.id] ? C.accent : C.border}`,
                        borderRadius:8,cursor:'pointer',fontSize:12,fontWeight:600,
                        color: postEnabled[p.id] ? C.accent : C.textMid,transition:'all .15s',
                      }}>
                        <span>{p.label}</span>
                        <span style={{width:18,height:18,borderRadius:'50%',flexShrink:0,
                          background:postEnabled[p.id]?C.accent:C.border,
                          display:'flex',alignItems:'center',justifyContent:'center'}}>
                          {postEnabled[p.id]
                            ? <svg width="9" height="9" fill="none" viewBox="0 0 24 24"
                                stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                            : <svg width="9" height="9" fill="none" viewBox="0 0 24 24"
                                stroke="white" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          }
                        </span>
                      </button>
                    ))}
                  </div>

                  {POST_PROCESS.filter(p => postEnabled[p.id]).length > 0 && (
                    <div style={{borderTop:`1px solid ${C.border}`,paddingTop:14}}>
                      <div style={{fontSize:10,fontWeight:700,color:C.textMid,letterSpacing:'.08em',
                        textTransform:'uppercase',marginBottom:10}}>Зардал оруулах</div>
                      {POST_PROCESS.filter(p => postEnabled[p.id]).map(p => (
                        <div key={p.id} style={{display:'grid',gridTemplateColumns:'1fr 1fr',
                          gap:10,marginBottom:8,alignItems:'center'}}>
                          <span style={{fontSize:12,color:C.textMid,fontWeight:500}}>{p.label}</span>
                          <input style={{...inp,textAlign:'right'}} type="number"
                            value={postProc[p.id]} onFocus={e => e.target.select()}
                            onChange={e => setPostProc(pp => ({...pp,[p.id]:+e.target.value||0}))}/>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Overhead + VAT */}
                <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,
                  padding:'20px 22px',marginBottom:24}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.textMid,letterSpacing:'.08em',
                    textTransform:'uppercase',marginBottom:12}}>Нэмэлт хувь</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                    <div>
                      <label style={lbl}>Нэмэгдэл (%)</label>
                      <input style={inp} type="number" value={overhead}
                        onFocus={e => e.target.select()}
                        onChange={e => setOverhead(+e.target.value||0)}/>
                    </div>
                    <div>
                      <label style={lbl}>НӨАТ (%)</label>
                      <input style={inp} type="number" value={vat}
                        onFocus={e => e.target.select()}
                        onChange={e => setVat(+e.target.value||0)}/>
                    </div>
                  </div>
                </div>

                <div style={{display:'flex',gap:10}}>
                  <button className="nav-btn" onClick={() => setStep(3)} style={{
                    padding:'12px 22px',background:C.surface,color:C.textMid,
                    border:`1.5px solid ${C.border}`,borderRadius:10,fontSize:14,fontWeight:600,
                  }}>
                    ← Буцах
                  </button>
                  <button className="nav-btn" onClick={() => setStep(5)} style={{
                    flex:1,padding:'12px 28px',background:C.accent,color:'white',
                    borderRadius:10,fontSize:14,fontWeight:700,
                    boxShadow:`0 4px 16px ${C.accentGlow}`,
                  }}>
                    Үр дүн харах →
                  </button>
                </div>
              </div>
            )}

            {/* ═══ STEP 5 — Үр дүн ══════════════════════════════════════ */}
            {step === 5 && (
              <div>
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:20,fontWeight:800,letterSpacing:'-.4px'}}>
                    Нийт зардлын дэлгэрэнгүй
                  </div>
                  <div style={{fontSize:13,color:C.textMid,marginTop:4}}>
                    {PRODUCT_TYPES[productType]?.label} · {qty.toLocaleString()} ш ·{' '}
                    {paperSize} · {colorOption} ·{' '}
                    {printMethod==='offset'?'Офсет':'Дижитал'}
                  </div>
                </div>

                {/* Key metrics */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
                  {[
                    { l:'Нийт өртөг',   v:fmtU(result.total),             sub:`${qty.toLocaleString()} ширхэг`,   color:C.accent },
                    { l:'Нэгж өртөг',   v:`₮${result.unitCost.toFixed(1)}`,sub:'нэг ширхэг',                       color:C.purple },
                    { l:'Үр ашиг',      v:`${result.efficiency.toFixed(1)}%`,sub:`${result.perSheet}ш/хуудас`,    color:C.success },
                  ].map(m => (
                    <div key={m.l} style={{background:C.surface,borderRadius:12,
                      border:`1px solid ${C.border}`,padding:'14px 16px',
                      position:'relative',overflow:'hidden'}}>
                      <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:m.color}}/>
                      <div style={{fontSize:9,color:C.textMid,fontWeight:700,letterSpacing:'.06em',
                        textTransform:'uppercase',marginBottom:6}}>{m.l}</div>
                      <div style={{fontSize:22,fontWeight:800,color:m.color,
                        letterSpacing:'-1px',lineHeight:1}}>{m.v}</div>
                      <div style={{fontSize:10,color:C.textDim,marginTop:4}}>{m.sub}</div>
                    </div>
                  ))}
                </div>

                {/* Layout + Breakdown */}
                <div style={{display:'grid',gridTemplateColumns:'220px 1fr',gap:14,marginBottom:14}}>
                  <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,
                    padding:'16px',display:'flex',flexDirection:'column',alignItems:'center'}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.text,marginBottom:10,
                      alignSelf:'flex-start'}}>Байршуулалт</div>
                    <LayoutVis cols={result.cols} rows={result.rows} pW={result.pw} pH={result.ph}
                      masterW={MASTER_W} masterH={MASTER_H} margin={marginMm} gap={gapMm}/>
                    <div style={{marginTop:10,fontSize:11,color:C.textMid,textAlign:'center'}}>
                      {result.cols}×{result.rows} = <strong style={{color:C.text}}>{result.perSheet}ш</strong>/хуудас
                    </div>
                  </div>
                  <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,
                    padding:'16px'}}>
                    <div style={{fontSize:11,fontWeight:700,color:C.text,marginBottom:10}}>
                      Зардлын задаргаа
                    </div>
                    {result.breakdown.map(({l,v}) => (
                      <div key={l} style={{display:'flex',justifyContent:'space-between',
                        alignItems:'center',padding:'5px 0',
                        borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                        <span style={{color:C.textMid}}>{l}</span>
                        <span style={{color:v>0?C.text:C.textDim,fontWeight:600,
                          fontVariantNumeric:'tabular-nums'}}>
                          {v>0?`₮${fmt(v)}`:'—'}
                        </span>
                      </div>
                    ))}
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
                      background:C.accentGlow,border:`1px solid ${C.accentDim}`,
                      borderRadius:8,padding:'10px 12px',marginTop:8}}>
                      <span style={{fontSize:13,color:C.accent,fontWeight:700}}>Нийт дүн</span>
                      <span style={{fontSize:18,color:C.accent,fontWeight:800,
                        fontVariantNumeric:'tabular-nums'}}>₮{fmt(result.total)}</span>
                    </div>
                  </div>
                </div>

                {/* Technical details */}
                <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,
                  padding:'16px',marginBottom:14}}>
                  <div style={{fontSize:11,fontWeight:700,color:C.text,marginBottom:10}}>
                    Техникийн дэлгэрэнгүй
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:0}}>
                    {[
                      ['Бүтээгдэхүүний хэмжээ', `${result.pw}×${result.ph}мм (${paperSize})`],
                      ['Мастер-д багтах',         `${result.cols}×${result.rows} = ${result.perSheet}ш`],
                      ['Дотоод хуудас',           `${result.innerSheets.toLocaleString()}`],
                      ['Форм тоо',                `${result.innerForms + result.coverForms}`],
                      ['Дарлалтын тоо',           `${(result.innerSheets*(result.sidesPerSheet||1) + result.coverSheets*2).toLocaleString()}`],
                      ['Нийт хуудас',            `${result.totalSheets.toLocaleString()}`],
                      hascover && ['Номын нуруу', `${result.spineWidth}мм`],
                      hascover && ['Хавтасны хуудас', `${result.coverSheets.toLocaleString()}`],
                    ].filter(Boolean).map(([k,v]) => (
                      <div key={k} style={{display:'flex',justifyContent:'space-between',
                        padding:'6px 8px',borderBottom:`1px solid ${C.border}`,fontSize:12}}>
                        <span style={{color:C.textMid}}>{k}</span>
                        <span style={{color:C.text,fontWeight:600}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price proposals */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:20}}>
                  {[20,30,40].map(m => {
                    const price = result.total*(1+m/100)
                    const unit  = qty>0 ? price/qty : 0
                    return (
                      <div key={m} style={{background:C.surface,borderRadius:10,
                        border:`1px solid ${C.border}`,padding:'14px',textAlign:'center'}}>
                        <div style={{fontSize:10,color:C.textDim,fontWeight:700,
                          marginBottom:4,letterSpacing:'.06em',textTransform:'uppercase'}}>
                          {m}% ашигтай
                        </div>
                        <div style={{fontSize:18,fontWeight:800,color:C.teal,
                          letterSpacing:'-1px'}}>₮{fmt(price)}</div>
                        <div style={{fontSize:11,color:C.textDim,marginTop:3}}>
                          нэгж: ₮{unit.toFixed(1)}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Actions */}
                <div style={{display:'grid',gridTemplateColumns:'auto 1fr 1fr',gap:10}}>
                  <button className="nav-btn" onClick={() => setStep(4)} style={{
                    padding:'12px 18px',background:C.surface,color:C.textMid,
                    border:`1.5px solid ${C.border}`,borderRadius:10,fontSize:13,fontWeight:600,
                  }}>
                    ← Буцах
                  </button>
                  <button className="nav-btn" onClick={handlePrint} style={{
                    padding:'13px',background:C.surface,color:C.accent,
                    border:`1.5px solid ${C.accentDim}`,borderRadius:10,
                    fontSize:13,fontWeight:700,
                    display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                  }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 6 2 18 2 18 9"/>
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                      <rect x="6" y="14" width="12" height="8"/>
                    </svg>
                    PDF үнийн санал
                  </button>
                  <button className="nav-btn"
                    onClick={() => { setCalcName(''); setSaveModal(true) }}
                    disabled={saving} style={{
                    padding:'13px',background:C.accent,color:'white',border:'none',
                    borderRadius:10,fontSize:13,fontWeight:700,opacity:saving?0.7:1,
                    boxShadow:`0 4px 16px ${C.accentGlow}`,
                    display:'flex',alignItems:'center',justifyContent:'center',gap:6,
                  }}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor" strokeWidth="2">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/>
                      <polyline points="7 3 7 8 15 8"/>
                    </svg>
                    {saving ? 'Хадгалж байна...' : 'Тооцоо хадгалах'}
                  </button>
                </div>

                {/* New calc */}
                <div style={{textAlign:'center',marginTop:16}}>
                  <button onClick={resetCalc} style={{
                    background:'none',border:'none',cursor:'pointer',
                    fontSize:12,color:C.textDim,fontWeight:600,
                    textDecoration:'underline',
                  }}>
                    🔄 Шинэ тооцоо эхлэх
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <FeedbackButton />

      {/* ── SAVE MODAL ── */}
      {saveModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.35)',zIndex:200,
          display:'flex',alignItems:'center',justifyContent:'center'}}
          onClick={e => e.target===e.currentTarget && setSaveModal(false)}>
          <div style={{background:'#fff',borderRadius:16,padding:'24px',width:340,
            boxShadow:'0 24px 60px rgba(0,0,0,0.18)'}}>
            <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:4}}>
              Тооцоо хадгалах
            </div>
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
              <button onClick={() => setSaveModal(false)} style={{
                flex:1,padding:'11px',background:C.bg,color:C.textMid,
                border:`1.5px solid ${C.border}`,borderRadius:9,fontSize:13,fontWeight:600,cursor:'pointer'}}>
                Цуцлах
              </button>
              <button onClick={saveCalc} style={{
                flex:1,padding:'11px',background:C.accent,color:'white',border:'none',
                borderRadius:9,fontSize:13,fontWeight:700,cursor:'pointer',
                boxShadow:`0 4px 16px ${C.accentGlow}`}}>
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
  const C2 = { bg:'#f4f6fb', border:'#e2e8f3', borderHover:'#c5d0e8',
    accent:'#4f7cff', accentDim:'#3563e9', accentGlow:'rgba(79,124,255,0.10)' }
  return (
    <div style={{position:'relative',background:C2.bg,border:`1.5px solid ${C2.border}`,
      borderRadius:6,width:vw,height:vh,flexShrink:0}}>
      <div style={{position:'absolute',left:sm,top:sm,right:sm,bottom:sm,
        border:`1px dashed ${C2.borderHover}`,borderRadius:2,pointerEvents:'none'}}/>
      {items.map(({x,y,n}) => (
        <div key={n} style={{position:'absolute',left:x,top:y,width:sw,height:sh,
          background:C2.accentGlow,border:`0.5px solid ${C2.accentDim}`,borderRadius:1,
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:Math.max(5,Math.min(8,sw/3)),color:C2.accent,fontWeight:700}}>
          {sw>12&&sh>10 ? n : ''}
        </div>
      ))}
    </div>
  )
}
