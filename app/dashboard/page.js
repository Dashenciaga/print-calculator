'use client'
import { useEffect, useRef, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import QuoteModal from '@/components/QuoteModal'
import UpgradeModal from '@/components/UpgradeModal'
import { bestLayout, calculateJob } from '@/lib/printCost'
import { normalizePrices, productRates } from '@/lib/priceSettings'

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
  const dk = false // хуудас цайвар дэвсгэртэй тул зураг ч цайвар
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
const CSS = `
.pc-grid { display: flex; gap: 20px; align-items: flex-start; }
.pc-main { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 14px; }
.pc-aside { flex: 0 0 380px; display: flex; flex-direction: column; gap: 14px; position: sticky; top: 16px; }
.pc-bar { display: none; }
.pc-chip:focus-visible, .pc-btn:focus-visible, .pc-in:focus-visible { outline: 2px solid #4f46e5; outline-offset: 2px; }
.pc-in:focus { border-color: #4f46e5; }
@media (max-width: 900px) {
  .pc-grid { flex-direction: column; }
  .pc-aside { flex: 1 1 auto; width: 100%; position: static; }
  .pc-body { padding-bottom: 96px !important; }
  .pc-bar { display: flex; position: fixed; left: 0; right: 0; bottom: 0; z-index: 20; background: white;
    border-top: 1px solid #e2e8f0; padding: 10px 16px 14px; align-items: center; justify-content: space-between; gap: 12px; }
  .pc-hide-sm { display: none !important; }
}
`

const C = { ink: '#1a1f36', mute: '#475569', line: '#e2e8f0', lineStrong: '#cbd5e1', brand: '#4f46e5', brandInk: '#3730a3', brandBg: '#eef2ff', soft: '#f8f9fb', good: '#15803d' }

const S = {
  page: { minHeight: '100vh', background: '#f4f5f7', fontFamily: 'var(--app-font)', color: C.ink },
  header: { background: 'white', borderBottom: `1px solid ${C.line}`, padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  brand: { display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 },
  avatar: { width: 30, height: 30, borderRadius: 8, background: C.brand, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0, overflow: 'hidden' },
  nav: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  navBtn: { fontFamily: 'inherit', fontSize: 13, fontWeight: 600, minHeight: 40, padding: '0 14px', borderRadius: 10, border: `1px solid ${C.line}`, background: 'white', color: C.ink, cursor: 'pointer' },
  proBtn: pro => ({ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, minHeight: 40, padding: '0 14px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${pro ? '#fcd34d' : '#c7d2fe'}`, background: pro ? '#fffbeb' : C.brandBg, color: pro ? '#92400e' : C.brandInk }),
  body: { maxWidth: 1280, margin: '0 auto', padding: '20px 24px 40px', boxSizing: 'border-box' },
  h1: { margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: '-.3px' },
  lead: { margin: '4px 0 0', fontSize: 14, color: C.mute },
  card: { background: 'white', border: `1px solid ${C.line}`, borderRadius: 14, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 },
  stepHead: { display: 'flex', alignItems: 'center', gap: 10 },
  stepNum: { width: 26, height: 26, borderRadius: 13, background: C.brand, color: 'white', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  h2: { margin: 0, fontSize: 16, fontWeight: 700 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  chip: on => ({ fontFamily: 'inherit', fontSize: 13, fontWeight: on ? 700 : 600, minHeight: 44, padding: '0 14px', borderRadius: 10, cursor: 'pointer', border: on ? `2px solid ${C.brand}` : `1px solid ${C.line}`, background: on ? C.brandBg : C.soft, color: on ? C.brandInk : C.ink }),
  row: { display: 'flex', flexWrap: 'wrap', gap: 14 },
  field: flex => ({ flex, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }),
  label: { fontSize: 13, fontWeight: 600, color: C.mute },
  input: { fontFamily: 'inherit', fontSize: 15, minHeight: 46, padding: '0 12px', borderRadius: 10, border: `1px solid ${C.lineStrong}`, background: 'white', color: C.ink, boxSizing: 'border-box', width: '100%', outline: 'none' },
  seg: { display: 'flex', gap: 4, background: '#f1f5f9', borderRadius: 10, padding: 3 },
  segBtn: on => ({ flex: 1, fontFamily: 'inherit', fontSize: 13, fontWeight: on ? 700 : 600, minHeight: 40, borderRadius: 8, cursor: 'pointer', border: on ? `1px solid ${C.line}` : '1px solid transparent', background: on ? 'white' : 'transparent', color: on ? C.ink : C.mute }),
  hint: { fontSize: 12, color: C.mute },
  finRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '6px 0' },
  finInput: { fontFamily: 'inherit', fontSize: 14, fontWeight: 600, width: 130, minHeight: 40, padding: '0 10px', borderRadius: 8, border: `1px solid ${C.lineStrong}`, textAlign: 'right', color: C.ink, boxSizing: 'border-box', outline: 'none' },
  advBtn: { fontFamily: 'inherit', textAlign: 'left', background: 'white', border: `1px dashed ${C.lineStrong}`, borderRadius: 14, padding: '12px 20px', minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, color: C.ink, cursor: 'pointer', width: '100%' },
  linkBtn: { border: 'none', background: 'none', padding: 0, fontFamily: 'inherit', fontSize: 12, color: C.brand, cursor: 'pointer', textDecoration: 'underline' },
  asideHead: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 },
  preview: { background: C.soft, borderRadius: 10, padding: 14, display: 'flex', justifyContent: 'center' },
  metrics: { display: 'flex', gap: 8 },
  metric: { flex: 1, background: C.soft, borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 2 },
  metricVal: { fontSize: 16, fontWeight: 700 },
  price: { fontSize: 34, fontWeight: 700, letterSpacing: '-.5px', color: C.good, lineHeight: 1.1 },
  dl: { margin: 0, display: 'flex', flexDirection: 'column', gap: 8, borderTop: `1px solid ${C.line}`, paddingTop: 14 },
  dRow: { display: 'flex', justifyContent: 'space-between', fontSize: 14 },
  dTotal: { display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, borderTop: `1px solid ${C.line}`, paddingTop: 8 },
  primary: { fontFamily: 'inherit', fontSize: 15, fontWeight: 700, minHeight: 48, borderRadius: 10, border: 'none', background: C.brand, color: 'white', cursor: 'pointer', padding: '0 18px' },
  secondary: { fontFamily: 'inherit', fontSize: 14, fontWeight: 600, minHeight: 44, borderRadius: 10, border: `1px solid ${C.lineStrong}`, background: 'white', color: C.ink, cursor: 'pointer' },
  info: { background: '#eff6ff', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#1e40af', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  err: { background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#b91c1c' },
}

const FINISH = [
  ['lak', 'Лак'], ['holio', 'Холио'], ['tigel', 'Тигель'], ['glue', 'Бүрэлт'], ['udees', 'Үдээс'],
]

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
  // Боловсруулалт: null = сонгоогүй, тоо = энэ тооцооны дүн
  const [fin, setFin] = useState({ glue: null, lak: null, holio: null, tigel: null, udees: null })
  // Нугалаа: auto = захиалгын тоо × тариф, manual = гараар оруулсан дүн, off = байхгүй
  const [foldMode, setFoldMode] = useState('auto')
  const [foldVal, setFoldVal] = useState(0)
  const [showAdv, setShowAdv] = useState(false)
  // Компанийн хадгалсан үнэ (Үнийн тохиргоо). Хадгалаагүй бол анхны утга.
  const [prices, setPrices] = useState(() => normalizePrices(null))
  const [pricesSaved, setPricesSaved] = useState(true)
  const [paperId, setPaperId] = useState('default')
  const curProdRef = useRef('poster')
  const [showQuote, setShowQuote] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [billing, setBilling] = useState(null) // { pro, expires_at, pending, ... } — серверээс
  const [showSave, setShowSave] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const cvRef = useRef(null)
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const { data: prof } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
      if (prof) setProfile(prof)
      // Компанийн үнийн тохиргоо — байхгүй эсвэл алдаа гарвал анхны утгаар үргэлжилнэ
      const { data: ps } = await supabase.from('price_settings').select('data').eq('user_id', user.id).maybeSingle()
      const pr = normalizePrices(ps?.data)
      setPrices(pr)
      setPricesSaved(!!ps)
      applyRates(curProdRef.current, pr)
      setPaperId(pr.papers[0].id); setA0Price(pr.papers[0].price)
      setProfit(pr.profit)
      // Pro эрхийг серверээс шалгана
      const br = await fetch('/api/billing/status', { cache: 'no-store' }).catch(() => null)
      if (br?.ok) setBilling(await br.json())
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
  const rates = useMemo(() => productRates(curProd, p, prices), [curProd, p, prices])
  const foldOn = foldMode === 'manual' || (foldMode === 'auto' && rates.fold > 0)
  const foldManual = foldMode === 'auto' ? null : foldMode === 'manual' ? foldVal : 0
  const vFold = foldManual ?? (rates.fold > 0 ? qty * rates.fold : 0)
  const finSum = Object.values(fin).reduce((a, v) => a + (v || 0), 0)
  const sheetName = printSheet === 'custom' ? `${psW}×${psH}` : printSheet

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
    finishingFixed: finSum + prices.cut,
    foldPerUnit:    rates.fold,
    foldManual,
    profitPct:      profit,
  }), [qty, qtyWaste, faces, p, sides, perSheet, spa, a0Price, platePr, pressPr, digPr, finSum, foldManual, profit, prices.cut, rates.fold])

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
    // Олон багтах байрлалыг нь зурна
    if (layout.vertical.count > layout.horizontal.count) drawCanvas(cvRef.current, sheet.h, sheet.w, prodW, prodH, layout.vertical)
    else drawCanvas(cvRef.current, sheet.w, sheet.h, prodW, prodH, layout.horizontal)
  }, [sheet, prodW, prodH, layout, user])

  // Бүтээгдэхүүний төрлөөс хамаарах тарифыг хадгалсан үнээс тавина
  function applyRates(key, pr) {
    const r = productRates(key, PRODUCTS[key], pr)
    setPlatePr(r.plate)
    setPressPr(r.press)
    setQtyWaste(r.waste)
    setDigPr(pr.digitalPrice)
  }

  function selectPaper(id) {
    setPaperId(id)
    const paper = prices.papers.find(x => x.id === id)
    if (paper) setA0Price(paper.price)
  }

  function selectProduct(key) {
    const p = PRODUCTS[key]
    curProdRef.current = key
    setCurProd(key)
    setSides(p.side)
    setPrintSheet(p.sheet)
    setSpa(p.spa)
    applyRates(key, prices)
    setProdW(p.pw)
    setProdH(p.ph)
    setFaces(p.faces)
    setActivePreset(PRESETS.find(x => x.w === p.pw && x.h === p.ph)?.id || 'cust')
    setFoldMode('auto')
    setPerSheetManual(null)
  }

  function toggleFold() {
    if (foldOn) setFoldMode('off')
    else if (rates.fold > 0) setFoldMode('auto')
    else { setFoldVal(0); setFoldMode('manual') }
  }

  // Сонгоход Үнийн тохиргооны дүн орно, дахин дарахад хасагдана
  function toggleFin(key) {
    setFin(f => ({ ...f, [key]: f[key] != null ? null : prices[key] }))
  }

  function openQuote() {
    if (billing?.pro) setShowQuote(true)
    else setShowUpgrade(true)
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
    <div style={S.page}>
      <style>{CSS}</style>

      <header style={S.header}>
        <div style={S.brand}>
          <div style={S.avatar}>
            {profile?.logo_url
              ? <img src={profile.logo_url} alt="" style={{width:30,height:30,objectFit:'cover'}}/>
              : initials}
          </div>
          <div style={{minWidth:0}}>
            <div style={{fontSize:14,fontWeight:700}}>{profile?.company_name || 'PrintCalc Pro'}</div>
            <div className="pc-hide-sm" style={{fontSize:12,color:C.mute}}>{user?.email}</div>
          </div>
        </div>
        <nav style={S.nav}>
          <button className="pc-btn" style={S.proBtn(billing?.pro)} onClick={()=>setShowUpgrade(true)}>
            {billing?.pro ? 'PRO' : billing?.pending ? 'Төлбөр шалгагдаж байна' : 'Pro авах'}
          </button>
          <button className="pc-btn" style={S.navBtn} onClick={()=>router.push('/prices')}>Үнийн тохиргоо</button>
          <button className="pc-btn" style={S.navBtn} onClick={()=>router.push('/profile')}>Профайл</button>
          <button className="pc-btn" style={S.navBtn} onClick={handleLogout}>Гарах</button>
        </nav>
      </header>

      <div className="pc-body" style={S.body}>
        <div style={{marginBottom:16}}>
          <h1 style={S.h1}>Шинэ тооцоо</h1>
          <p style={S.lead}>Гурван алхмаар бөглөнө. Үнэ тэр дороо шинэчлэгдэнэ.</p>
        </div>

        <div className="pc-grid">
          <main className="pc-main">
            {!pricesSaved && (
              <div style={S.info}>
                <span>Одоо жишиг үнээр тооцож байна. Өөрийн компанийн үнийг нэг удаа оруулаад хадгалаарай.</span>
                <button style={{...S.linkBtn,fontSize:13,fontWeight:700}} onClick={()=>router.push('/prices')}>Үнээ оруулах →</button>
              </div>
            )}
            {calcError && <div role="alert" style={S.err}>{calcError}. Хэмжээ эсвэл «1 хуудаст багтах тоо»-г шалгана уу.</div>}

            {/* 1 */}
            <section style={S.card}>
              <div style={S.stepHead}><span style={S.stepNum}>1</span><h2 style={S.h2}>Юу хэвлэх вэ</h2></div>
              <div style={S.chips} role="group" aria-label="Бүтээгдэхүүн">
                {Object.entries(PRODUCTS).map(([key, val]) => (
                  <button key={key} className="pc-chip" aria-pressed={curProd===key} style={S.chip(curProd===key)} onClick={()=>selectProduct(key)}>{val.t}</button>
                ))}
              </div>
              <div style={S.row}>
                <div style={S.field('2 1 220px')}>
                  <label htmlFor="pc-size" style={S.label}>Хэмжээ</label>
                  <select id="pc-size" className="pc-in" style={S.input} value={activePreset} onChange={e=>handlePreset(PRESETS.find(x=>x.id===e.target.value))}>
                    {PRESETS.filter(x=>x.id!=='cust').map(x => <option key={x.id} value={x.id}>{x.label} — {x.w} × {x.h} мм</option>)}
                    <option value="cust">Дурын хэмжээ…</option>
                  </select>
                </div>
                <div style={S.field('1 1 130px')}>
                  <label htmlFor="pc-qty" style={S.label}>Тоо ширхэг</label>
                  <input id="pc-qty" className="pc-in" type="number" min={0} inputMode="numeric" style={{...S.input,fontWeight:700}} value={qty} onFocus={e=>e.target.select()} onChange={e=>setQty(Math.max(0,+e.target.value||0))}/>
                </div>
                <div style={S.field('1 1 190px')}>
                  <span id="pc-sides" style={S.label}>Хэвлэлийн тал</span>
                  <div role="group" aria-labelledby="pc-sides" style={S.seg}>
                    <button className="pc-btn" aria-pressed={sides===1} style={S.segBtn(sides===1)} onClick={()=>setSides(1)}>Нэг тал</button>
                    <button className="pc-btn" aria-pressed={sides===2} style={S.segBtn(sides===2)} onClick={()=>setSides(2)}>Хоёр тал</button>
                  </div>
                </div>
              </div>
              {(activePreset === 'cust' || p.faces > 1) && (
                <div style={S.row}>
                  {activePreset === 'cust' && <>
                    <div style={S.field('1 1 130px')}>
                      <label htmlFor="pc-w" style={S.label}>Өргөн, мм</label>
                      <input id="pc-w" className="pc-in" type="number" min={0} style={S.input} value={prodW} onFocus={e=>e.target.select()} onChange={e=>{setProdW(+e.target.value||0);setPerSheetManual(null)}}/>
                    </div>
                    <div style={S.field('1 1 130px')}>
                      <label htmlFor="pc-h" style={S.label}>Өндөр, мм</label>
                      <input id="pc-h" className="pc-in" type="number" min={0} style={S.input} value={prodH} onFocus={e=>e.target.select()} onChange={e=>{setProdH(+e.target.value||0);setPerSheetManual(null)}}/>
                    </div>
                  </>}
                  {p.faces > 1 && (
                    <div style={S.field('1 1 130px')}>
                      <label htmlFor="pc-faces" style={S.label}>Нүүрийн тоо</label>
                      <input id="pc-faces" className="pc-in" type="number" min={1} style={S.input} value={faces} onFocus={e=>e.target.select()} onChange={e=>setFaces(+e.target.value||4)}/>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* 2 */}
            <section style={S.card}>
              <div style={S.stepHead}><span style={S.stepNum}>2</span><h2 style={S.h2}>Юугаар хэвлэх вэ</h2></div>
              <div style={S.row}>
                <div style={S.field('2 1 240px')}>
                  <label htmlFor="pc-paper" style={S.label}>Цаас</label>
                  <select id="pc-paper" className="pc-in" style={S.input} value={paperId} onChange={e=>selectPaper(e.target.value)}>
                    {prices.papers.map(x => <option key={x.id} value={x.id}>{x.name} — А0 нь ₮{x.price.toLocaleString()}</option>)}
                    {paperId === '' && <option value="">Гараар оруулсан үнэ — ₮{a0Price.toLocaleString()}</option>}
                  </select>
                  <span style={S.hint}>Жагсаалт, үнийг <button style={S.linkBtn} onClick={()=>router.push('/prices')}>Үнийн тохиргоо</button>-ноос авна.</span>
                </div>
                <div style={S.field('1 1 190px')}>
                  <label htmlFor="pc-sheet" style={S.label}>Хэвлэх хуудас</label>
                  <select id="pc-sheet" className="pc-in" style={S.input} value={printSheet} onChange={e=>handleSheetChange(e.target.value)}>
                    {Object.entries(SHEET_SIZES).map(([k, v]) => <option key={k} value={k}>{k} — {v.w} × {v.h} мм</option>)}
                    <option value="custom">Дурын хэмжээ…</option>
                  </select>
                </div>
              </div>
              {printSheet === 'custom' && (
                <div style={S.row}>
                  <div style={S.field('1 1 130px')}>
                    <label htmlFor="pc-sw" style={S.label}>Хуудасны өргөн, мм</label>
                    <input id="pc-sw" className="pc-in" type="number" min={0} style={S.input} value={psW} onFocus={e=>e.target.select()} onChange={e=>{setPsW(+e.target.value||0);setPerSheetManual(null)}}/>
                  </div>
                  <div style={S.field('1 1 130px')}>
                    <label htmlFor="pc-sh" style={S.label}>Хуудасны өндөр, мм</label>
                    <input id="pc-sh" className="pc-in" type="number" min={0} style={S.input} value={psH} onFocus={e=>e.target.select()} onChange={e=>{setPsH(+e.target.value||0);setPerSheetManual(null)}}/>
                  </div>
                </div>
              )}
            </section>

            {/* 3 */}
            <section style={S.card}>
              <div style={S.stepHead}><span style={S.stepNum}>3</span><h2 style={S.h2}>Боловсруулалт</h2></div>
              <div style={S.chips} role="group" aria-label="Боловсруулалт">
                <button className="pc-chip" aria-pressed="true" disabled style={{...S.chip(true),cursor:'default'}}>Огтлоо · {fmt(prices.cut)}</button>
                <button className="pc-chip" aria-pressed={foldOn} style={S.chip(foldOn)} onClick={toggleFold}>Нугалаа{foldOn ? ` · ${fmt(vFold)}` : ''}</button>
                {FINISH.map(([k, label]) => (
                  <button key={k} className="pc-chip" aria-pressed={fin[k] != null} style={S.chip(fin[k] != null)} onClick={()=>toggleFin(k)}>
                    {label}{fin[k] != null ? ` · ${fmt(fin[k])}` : ''}
                  </button>
                ))}
              </div>
              {(foldOn || FINISH.some(([k]) => fin[k] != null)) && (
                <div style={{borderTop:`1px solid ${C.line}`,paddingTop:8}}>
                  {foldOn && (
                    <div style={S.finRow}>
                      <label htmlFor="pc-fold" style={{fontSize:14}}>
                        Нугалаа, нийт дүн{' '}
                        {foldMode === 'manual' && rates.fold > 0 && <button style={S.linkBtn} onClick={()=>setFoldMode('auto')}>авто ({fmt(qty * rates.fold)})</button>}
                        {foldMode === 'auto' && <span style={S.hint}>{qty.toLocaleString()} × ₮{rates.fold}</span>}
                      </label>
                      <input id="pc-fold" className="pc-in" type="number" min={0} style={S.finInput} value={vFold} onFocus={e=>e.target.select()} onChange={e=>{setFoldMode('manual');setFoldVal(Math.max(0,+e.target.value||0))}}/>
                    </div>
                  )}
                  {FINISH.filter(([k]) => fin[k] != null).map(([k, label]) => (
                    <div key={k} style={S.finRow}>
                      <label htmlFor={`pc-fin-${k}`} style={{fontSize:14}}>{label}, нийт дүн</label>
                      <input id={`pc-fin-${k}`} className="pc-in" type="number" min={0} style={S.finInput} value={fin[k]} onFocus={e=>e.target.select()} onChange={e=>setFin(f=>({...f,[k]:Math.max(0,+e.target.value||0)}))}/>
                    </div>
                  ))}
                </div>
              )}
              <span style={S.hint}>Дарж сонгоно. Дүн нь Үнийн тохиргооноос орно, энэ тооцоонд зориулж засаж болно.</span>
            </section>

            {/* Нарийвчилсан */}
            <button className="pc-btn" aria-expanded={showAdv} aria-controls="pc-adv" style={S.advBtn} onClick={()=>setShowAdv(v=>!v)}>
              <span style={{display:'flex',flexDirection:'column',gap:2}}>
                <span style={{fontSize:14,fontWeight:700}}>Нарийвчилсан тохиргоо</span>
                <span style={S.hint}>
                  Хадаас {qtyWaste} · {p.dig ? `Дижитал ₮${digPr.toLocaleString()}/хуудас` : `Төмөр ₮${platePr.toLocaleString()} · Даралт ₮${pressPr.toLocaleString()}`} · А0-оос {spa} хуудас
                </span>
              </span>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.mute} strokeWidth="2" style={{transform:showAdv?'rotate(180deg)':'none',flexShrink:0}}><path d="M6 9l6 6 6-6"/></svg>
            </button>
            {showAdv && (
              <section id="pc-adv" style={S.card}>
                <div style={S.row}>
                  <div style={S.field('1 1 150px')}>
                    <label htmlFor="pc-waste" style={S.label}>Хадаас, хуудас</label>
                    <input id="pc-waste" className="pc-in" type="number" min={0} style={S.input} value={qtyWaste} onFocus={e=>e.target.select()} onChange={e=>setQtyWaste(Math.max(0,+e.target.value||0))}/>
                  </div>
                  <div style={S.field('1 1 150px')}>
                    <label htmlFor="pc-per" style={S.label}>1 хуудаст багтах тоо</label>
                    <input id="pc-per" className="pc-in" type="number" min={0} style={{...S.input,background:perSheetManual!=null?'#fefce8':'white'}} value={perSheet} onFocus={e=>e.target.select()} onChange={e=>setPerSheetManual(Math.max(0,Math.floor(+e.target.value||0)))}/>
                    {perSheetManual != null
                      ? <button style={{...S.linkBtn,textAlign:'left'}} onClick={()=>setPerSheetManual(null)}>Автомат руу буцаах ({layout.perSheet})</button>
                      : <span style={S.hint}>Автомат: хэвтээ {layout.horizontal.count}, босоо {layout.vertical.count}</span>}
                  </div>
                  <div style={S.field('1 1 150px')}>
                    <label htmlFor="pc-spa" style={S.label}>Нэг А0-оос гарах хуудас</label>
                    <input id="pc-spa" className="pc-in" type="number" min={1} style={S.input} value={spa} onFocus={e=>e.target.select()} onChange={e=>setSpa(+e.target.value||1)}/>
                  </div>
                </div>
                <div style={S.row}>
                  <div style={S.field('1 1 150px')}>
                    <label htmlFor="pc-a0" style={S.label}>А0 цаасны үнэ, ₮</label>
                    <input id="pc-a0" className="pc-in" type="number" min={0} style={S.input} value={a0Price} onFocus={e=>e.target.select()} onChange={e=>{setA0Price(Math.max(0,+e.target.value||0));setPaperId('')}}/>
                  </div>
                  {p.dig ? (
                    <div style={S.field('1 1 150px')}>
                      <label htmlFor="pc-dig" style={S.label}>Дижитал үнэ, ₮/хуудас</label>
                      <input id="pc-dig" className="pc-in" type="number" min={0} style={S.input} value={digPr} onFocus={e=>e.target.select()} onChange={e=>setDigPr(Math.max(0,+e.target.value||0))}/>
                    </div>
                  ) : <>
                    <div style={S.field('1 1 150px')}>
                      <label htmlFor="pc-plate" style={S.label}>Төмрийн үнэ, ₮/ш</label>
                      <input id="pc-plate" className="pc-in" type="number" min={0} style={S.input} value={platePr} onFocus={e=>e.target.select()} onChange={e=>setPlatePr(Math.max(0,+e.target.value||0))}/>
                    </div>
                    <div style={S.field('1 1 150px')}>
                      <label htmlFor="pc-press" style={S.label}>Даралтын үнэ, ₮</label>
                      <input id="pc-press" className="pc-in" type="number" min={0} style={S.input} value={pressPr} onFocus={e=>e.target.select()} onChange={e=>setPressPr(Math.max(0,+e.target.value||0))}/>
                    </div>
                  </>}
                </div>
                <span style={S.hint}>Эндхийн өөрчлөлт зөвхөн энэ тооцоонд хүчинтэй. Байнгын үнээ Үнийн тохиргоонд засна.</span>
              </section>
            )}
          </main>

          <aside className="pc-aside">
            <section style={S.card}>
              <div style={S.asideHead}>
                <h2 style={{...S.h2,fontSize:14}}>Байршуулалт</h2>
                <span style={{fontSize:13,color:C.mute}}>{sheetName} хуудсанд <strong style={{color:C.ink}}>{perSheet} ширхэг</strong></span>
              </div>
              <div style={S.preview}>
                <canvas ref={cvRef} width={230} height={230} role="img" aria-label={`${sheetName} хуудсанд ${perSheet} ширхэг багтсан байршил`}/>
              </div>
              <div style={S.metrics}>
                <div style={S.metric}><span style={S.hint}>Хэвлэх хуудас</span><span style={S.metricVal}>{fmtN(result.totalSheets)}</span></div>
                <div style={S.metric}><span style={S.hint}>А0 цаас</span><span style={S.metricVal}>{fmtN(result.a0Sheets)} ш</span></div>
              </div>
            </section>

            <section style={S.card}>
              <div style={{display:'flex',flexDirection:'column',gap:2}}>
                <span style={S.label}>Үйлчлүүлэгчийн үнэ</span>
                <span style={S.price} aria-live="polite">{result.client != null ? fmt(result.client) : '—'}</span>
                <span style={{fontSize:13,color:C.mute}}>Нэгж үнэ {result.unit != null ? '₮' + result.unit.toLocaleString(undefined,{maximumFractionDigits:1}) : '—'} · НӨАТ-гүй</span>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                <span id="pc-profit" style={S.label}>Ашиг</span>
                <div role="group" aria-labelledby="pc-profit" style={{display:'flex',gap:6,alignItems:'center'}}>
                  {[20,30,40].map(n => (
                    <button key={n} className="pc-chip" aria-pressed={profit===n} style={{...S.chip(profit===n),flex:1,padding:0}} onClick={()=>setProfit(n)}>{n}%</button>
                  ))}
                  <input aria-label="Ашгийн хувь" className="pc-in" type="number" min={0} max={1000} style={{...S.finInput,width:76,minHeight:44}} value={profit} onFocus={e=>e.target.select()} onChange={e=>setProfit(Math.min(1000,Math.max(0,+e.target.value||0)))}/>
                </div>
              </div>
              <dl style={S.dl}>
                <div style={S.dRow}><dt style={{color:C.mute}}>Цаас</dt><dd style={{margin:0,fontWeight:600}}>{result.paperCost != null ? fmt(result.paperCost) : '—'}</dd></div>
                {!p.dig && <div style={S.dRow}><dt style={{color:C.mute}}>Төмөр, {result.plates ?? 0} ш</dt><dd style={{margin:0,fontWeight:600}}>{result.plateCost != null ? fmt(result.plateCost) : '—'}</dd></div>}
                <div style={S.dRow}><dt style={{color:C.mute}}>{p.dig ? 'Дижитал хэвлэл' : 'Даралт'}</dt><dd style={{margin:0,fontWeight:600}}>{result.pressCost != null ? fmt(result.pressCost) : '—'}</dd></div>
                <div style={S.dRow}><dt style={{color:C.mute}}>Боловсруулалт</dt><dd style={{margin:0,fontWeight:600}}>{result.finishing != null ? fmt(result.finishing) : '—'}</dd></div>
                <div style={S.dTotal}><dt>Нийт өртөг</dt><dd style={{margin:0}}>{result.total != null ? fmt(result.total) : '—'}</dd></div>
              </dl>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <button className="pc-btn" style={S.primary} onClick={openQuote}>{billing?.pro ? 'Үнийн санал гаргах' : 'Үнийн санал гаргах · Pro'}</button>
                <button className="pc-btn" style={S.secondary} onClick={()=>{setSaveName('');setSaveMsg('');setShowSave(true)}}>Тооцоог хадгалах</button>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <div className="pc-bar">
        <div style={{display:'flex',flexDirection:'column'}}>
          <span style={{fontSize:12,fontWeight:600,color:C.mute}}>Үйлчлүүлэгчийн үнэ</span>
          <span style={{fontSize:22,fontWeight:700,color:C.good}}>{result.client != null ? fmt(result.client) : '—'}</span>
        </div>
        <button className="pc-btn" style={S.primary} onClick={openQuote}>Үнийн санал</button>
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

      {showUpgrade && (
        <UpgradeModal onClose={() => setShowUpgrade(false)} onChange={setBilling} />
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
              fin.glue != null && 'Бүрэлт', foldOn && 'Нугалаа', fin.lak != null && 'Лак',
              fin.holio != null && 'Холио', fin.tigel != null && 'Тигель', fin.udees != null && 'Үдээс',
              'Огтлоо',
            ].filter(Boolean).join(' · '),
            productName: p.t,
          }}
        />
      )}
    </div>
  )
}