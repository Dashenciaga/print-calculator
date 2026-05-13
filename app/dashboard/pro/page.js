'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'

// ── Бүтээгдэхүүний төрлүүд (Excel sheet-үүдийн логик) ─────────
const PRODUCT_TYPES = {
  poster:    { label: 'Постер',        icon: '🖼️',  sheets: ['ПОСТЕР'] },
  brochure:  { label: 'Брошур / Флайер', icon: '📄', sheets: ['БРОШУР'] },
  magazine:  { label: 'Сэтгүүл / Каталог', icon: '📖', sheets: ['СЭТГҮҮЛ'] },
  calendar:  { label: 'Календар',      icon: '📅',  sheets: ['КАЛЕНДАР'] },
  newspaper: { label: 'Сонин',         icon: '📰',  sheets: ['СОНИН'] },
  book:      { label: 'Ном / Дэвтэр',  icon: '📚',  sheets: ['НОМ', 'ДЭВТЭР'] },
  blank:     { label: 'Бланк / Сертификат', icon: '📋', sheets: ['БЛАНК'] },
  sticker:   { label: 'Стикер',        icon: '🏷️',  sheets: ['СТИКЕР'] },
  namecard:  { label: 'Нэрийн хуудас', icon: '💳',  sheets: ['НЭРИЙН ХУУДАС'] },
  packaging: { label: 'Сав баглаа',    icon: '📦',  sheets: ['САВ БАГЛАА'] },
}

const PRINT_METHODS = [
  { id: 'offset', label: 'Офсет' },
  { id: 'digital', label: 'Дижитал' },
]

const PAPER_SIZES = {
  'А0': [841, 1189], 'А1': [594, 841], 'А2': [420, 594],
  'А3': [297, 420], 'А4': [210, 297], 'А5': [148, 210],
  'В3': [353, 500], 'В4': [250, 353], 'В5': [176, 250],
  '210х75': [210, 75], '99х210': [99, 210], 'Дурын': null,
}

const PAPER_WEIGHTS = [48, 70, 80, 100, 105, 115, 120, 128, 150, 157, 200, 250, 300]

// Excel-ийн цаасны үнэ (гр/м2 → нэгж үнэ ₮)
const PAPER_PRICES = {
  48: 210, 70: 318, 80: 336, 100: 500, 105: 630,
  115: 700, 120: 830, 128: 770, 150: 890, 157: 950,
  200: 1200, 250: 1500, 300: 1900,
}

// Хэвлэлтийн дараах боловсруулалт
const POST_PROCESS = [
  { id: 'coating', label: 'Бүрэлт (лакдалт)', defaultCost: 40000 },
  { id: 'tigel',   label: 'Тигель (хайчлах)', defaultCost: 20000 },
  { id: 'lacquer', label: 'Лак',               defaultCost: 15000 },
  { id: 'mix',     label: 'Холио',             defaultCost: 10000 },
  { id: 'fold',    label: 'Нугалаа',           defaultCost: 10000 },
  { id: 'glue',    label: 'Наалт',             defaultCost: 25000 },
  { id: 'stitch',  label: 'Үдээс / Оёдол',    defaultCost: 30000 },
  { id: 'cut',     label: 'Огтлоо',            defaultCost: 20000 },
]

// Өнгөний хувилбарууд
const COLOR_OPTIONS = [
  { id: '1+0', label: '1+0 (нэг тал хар)' },
  { id: '1+1', label: '1+1 (хоёр тал хар)' },
  { id: '4+0', label: '4+0 (нэг тал өнгөт)' },
  { id: '4+4', label: '4+4 (хоёр тал өнгөт)' },
]

// Зарчим: Excel-ийн А0 цаасны хэмжээ 889x1194мм
const MASTER_W = 889, MASTER_H = 1194

// ── Design tokens ──────────────────────────────────────────────
const C = {
  bg: '#0a0d14', surface: '#111520', surfaceHover: '#171e2e',
  border: '#1e2840', borderHover: '#2d3f5e',
  accent: '#4f7cff', accentDim: '#2d52cc', accentGlow: 'rgba(79,124,255,0.15)',
  success: '#1dd4a0', warn: '#f5a623', danger: '#f04060',
  text: '#dde4f4', textMid: '#7a8cad', textDim: '#3d4d6a',
  purple: '#a78bfa', teal: '#2dd4bf',
}

const inp = {
  width: '100%', padding: '8px 11px', fontSize: 13, fontWeight: 500,
  border: `1.5px solid ${C.border}`, borderRadius: 7, background: C.bg,
  color: C.text, outline: 'none', boxSizing: 'border-box',
  transition: 'border-color .15s',
}
const lbl = {
  display: 'block', fontSize: 10, fontWeight: 700, color: C.textMid,
  marginBottom: 4, letterSpacing: '.08em', textTransform: 'uppercase',
}
const card = {
  background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`,
  padding: '18px 20px', marginBottom: 14,
}
const sectionTitle = {
  fontSize: 12, fontWeight: 700, color: C.textMid,
  letterSpacing: '.06em', textTransform: 'uppercase',
  marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
}

export default function ProCalculator() {
  const router = useRouter()
  const [productType, setProductType] = useState('brochure')
  const [printMethod, setPrintMethod] = useState('offset')
  const [qty, setQty] = useState(500)
  const [paperSize, setPaperSize] = useState('А4')
  const [customW, setCustomW] = useState(210)
  const [customH, setCustomH] = useState(297)
  const [paperWeight, setPaperWeight] = useState(157)
  const [colorOption, setColorOption] = useState('4+4')
  const [pages, setPages] = useState(8)
  const [hascover, setHascover] = useState(false)
  const [coverWeight, setCoverWeight] = useState(250)
  const [orient, setOrient] = useState('portrait')
  const [marginMm, setMarginMm] = useState(5)
  const [gapMm, setGapMm] = useState(3)

  // Үнийн тохиргоо
  const [setupCost, setSetupCost] = useState(50000)
  const [pressureCost, setPressureCost] = useState(40000)
  const [overhead, setOverhead] = useState(20)
  const [vat, setVat] = useState(10)

  // Хэвлэлтийн дараах боловсруулалт
  const [postProc, setPostProc] = useState({
    coating: 0, tigel: 0, lacquer: 0, mix: 0,
    fold: 0, glue: 0, stitch: 0, cut: 20000,
  })
  // Аль боловсруулалт идэвхтэй байгааг тусад нь хадгална
  const [postEnabled, setPostEnabled] = useState({
    coating: false, tigel: false, lacquer: false, mix: false,
    fold: false, glue: false, stitch: false, cut: true,
  })

  const togglePost = (id) => {
    const def = POST_PROCESS.find(p => p.id === id).defaultCost
    const nowEnabled = !postEnabled[id]
    setPostEnabled(p => ({ ...p, [id]: nowEnabled }))
    setPostProc(p => ({ ...p, [id]: nowEnabled ? def : 0 }))
  }

  // ── Тооцоолол ─────────────────────────────────────────────────
  const result = useMemo(() => {
    const [pw, ph] = paperSize === 'Дурын'
      ? (orient === 'landscape' ? [Math.max(customW, customH), Math.min(customW, customH)]
                                : [Math.min(customW, customH), Math.max(customW, customH)])
      : orient === 'landscape'
        ? [PAPER_SIZES[paperSize][1], PAPER_SIZES[paperSize][0]]
        : PAPER_SIZES[paperSize]

    // Нэг А0 хуудаст хэдэн хуудас багтах
    const usableW = MASTER_W - 2 * marginMm
    const usableH = MASTER_H - 2 * marginMm
    const cols = pw > 0 ? Math.max(0, Math.floor((usableW + gapMm) / (pw + gapMm))) : 0
    const rows = ph > 0 ? Math.max(0, Math.floor((usableH + gapMm) / (ph + gapMm))) : 0
    const perSheet = cols * rows

    // Нүүрний тоо (дотоод хуудас)
    const innerPages = hascover ? Math.max(0, pages - 4) : pages
    const colorSides = colorOption.startsWith('4') ? 4 : 1
    const sidesPerSheet = colorOption.endsWith('+4') || colorOption.endsWith('+1') ? 2 : 1

    // Цаасны тоо (нүүрийг 2-т хуваана — нэг хуудасны 2 тал)
    const pagesPerSheet = perSheet * sidesPerSheet
    const innerSheets = innerPages > 0 && pagesPerSheet > 0 ? Math.ceil(innerPages / pagesPerSheet) * qty : 0

    // Хавтасны хуудас
    const coverSheets = hascover
      ? Math.ceil(qty / Math.max(1, Math.floor((usableW + gapMm) / ((pw * 2 + 5) + gapMm)) *
          Math.floor((usableH + gapMm) / (ph + gapMm)))) : 0

    const totalSheets = innerSheets + coverSheets

    // Цаасны үнэ
    const innerPaperPrice = PAPER_PRICES[paperWeight] || 950
    const coverPaperPrice = PAPER_PRICES[coverWeight] || 1500
    const innerPaperCost = innerSheets * innerPaperPrice
    const coverPaperCost = coverSheets * coverPaperPrice
    const totalPaperCost = innerPaperCost + coverPaperCost

    // Өнгөний хавтан — офсет
    const colorPlates = colorSides // өнгөт = 4 хавтан, хар = 1 хавтан
    const platePrice = 3850
    const plateCost = printMethod === 'offset' ? colorPlates * platePrice : 0

    // Даралтын үнэ
    const pressureTotal = pressureCost * Math.ceil(totalSheets / 1000) || pressureCost

    // Хэвлэлтийн дараах боловсруулалт
    const postTotal = Object.values(postProc).reduce((s, v) => s + (v || 0), 0)

    // Нийт зардал
    const subtotal = setupCost + totalPaperCost + plateCost + pressureTotal + postTotal
    const overheadAmt = subtotal * (overhead / 100)
    const base = subtotal + overheadAmt
    const vatAmt = base * (vat / 100)
    const total = base + vatAmt
    const unitCost = qty > 0 ? total / qty : 0

    const efficiency = pagesPerSheet > 0 && innerPages > 0
      ? (innerPages / (Math.ceil(innerPages / pagesPerSheet) * pagesPerSheet) * 100)
      : 100

    return {
      pw, ph, cols, rows, perSheet, pagesPerSheet,
      innerSheets, coverSheets, totalSheets,
      totalPaperCost, plateCost, pressureTotal, postTotal,
      setupCost, overheadAmt, vatAmt, total, unitCost,
      efficiency,
      breakdown: [
        { l: 'Цаасны зардал', v: totalPaperCost },
        { l: 'Ажиллагааны үнэ', v: setupCost },
        { l: 'Өнгөний хавтан', v: plateCost },
        { l: 'Даралтын зардал', v: pressureTotal },
        { l: 'Боловсруулалт', v: postTotal },
        { l: `Нэмэгдэл ${overhead}%`, v: overheadAmt },
        { l: `НӨАТ ${vat}%`, v: vatAmt },
      ],
    }
  }, [productType, printMethod, qty, paperSize, customW, customH, paperWeight,
      colorOption, pages, hascover, coverWeight, orient, marginMm, gapMm,
      setupCost, pressureCost, overhead, vat, postProc])

  const fmt = n => Math.round(n).toLocaleString()
  const fmtU = n => n >= 1000000
    ? `₮${(n/1000000).toFixed(1)}сая`
    : `₮${fmt(n)}`

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', background: C.bg,
      fontFamily: "'DM Sans','Helvetica Neue',sans-serif", color: C.text,
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        input:focus, select:focus { border-color: ${C.accent} !important; box-shadow: 0 0 0 3px ${C.accentGlow}; }
        ::-webkit-scrollbar { width: 5px; } ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 10px; }
        .prod-btn:hover { background: ${C.surfaceHover} !important; border-color: ${C.borderHover} !important; }
        .post-btn:hover { border-color: ${C.accent} !important; }
        .calc-row:hover td { background: ${C.surfaceHover}; }
      `}</style>

      {/* ── Зүүн тал: Тохиргоо ── */}
      <div style={{ width: 440, flexShrink: 0, overflowY: 'auto', padding: '24px 20px', borderRight: `1px solid ${C.border}` }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, background: C.accent, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 16px ${C.accentGlow}` }}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2.5">
                  <rect x="2" y="3" width="20" height="18" rx="2"/><path d="M8 7h8M8 12h5"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text, letterSpacing: '-.3px' }}>Pro Тооцоолол</div>
                <div style={{ fontSize: 10, color: C.textDim }}>Нарийн хэвлэлийн зардал</div>
              </div>
            </div>
            <button onClick={() => router.push('/dashboard')} style={{ padding: '6px 11px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 7, color: C.textMid, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
              Энгийн харах
            </button>
          </div>
        </div>

        {/* Бүтээгдэхүүний төрөл */}
        <div style={card}>
          <div style={sectionTitle}>
            <span>📦</span> Бүтээгдэхүүний төрөл
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {Object.entries(PRODUCT_TYPES).map(([k, v]) => (
              <button key={k} className="prod-btn"
                onClick={() => setProductType(k)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px',
                  background: productType === k ? C.accentGlow : C.bg,
                  border: `1.5px solid ${productType === k ? C.accent : C.border}`,
                  borderRadius: 8, cursor: 'pointer', textAlign: 'left',
                  color: productType === k ? C.accent : C.textMid,
                  fontSize: 12, fontWeight: productType === k ? 700 : 500, transition: 'all .15s',
                }}>
                <span style={{ fontSize: 16 }}>{v.icon}</span>
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* Хэвлэх арга */}
        <div style={card}>
          <div style={sectionTitle}><span>🖨️</span> Хэвлэх арга</div>
          <div style={{ display: 'flex', background: C.bg, borderRadius: 8, border: `1.5px solid ${C.border}`, overflow: 'hidden' }}>
            {PRINT_METHODS.map(m => (
              <button key={m.id} onClick={() => setPrintMethod(m.id)} style={{
                flex: 1, padding: '9px', fontSize: 13, fontWeight: 600, border: 'none',
                background: printMethod === m.id ? C.accentGlow : 'none',
                color: printMethod === m.id ? C.accent : C.textMid, cursor: 'pointer', transition: 'all .15s',
              }}>{m.label}</button>
            ))}
          </div>
        </div>

        {/* Цаасны тохиргоо */}
        <div style={card}>
          <div style={sectionTitle}><span>📐</span> Цаасны тохиргоо</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={lbl}>Хэмжээ</label>
              <select style={{ ...inp }} value={paperSize} onChange={e => setPaperSize(e.target.value)}>
                {Object.keys(PAPER_SIZES).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Чиглэл</label>
              <div style={{ display: 'flex', background: C.bg, borderRadius: 7, border: `1.5px solid ${C.border}`, overflow: 'hidden' }}>
                {['portrait','landscape'].map(o => (
                  <button key={o} onClick={() => setOrient(o)} style={{
                    flex: 1, padding: '8px 4px', fontSize: 11, fontWeight: 600, border: 'none',
                    background: orient === o ? C.accentGlow : 'none',
                    color: orient === o ? C.accent : C.textMid, cursor: 'pointer',
                  }}>{o === 'portrait' ? '↕ Босоо' : '↔ Хэвтээ'}</button>
                ))}
              </div>
            </div>
          </div>

          {paperSize === 'Дурын' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={lbl}>Өргөн (мм)</label>
                <input style={inp} type="number" value={customW} onFocus={e => e.target.select()} onChange={e => setCustomW(+e.target.value || 0)} />
              </div>
              <div>
                <label style={lbl}>Өндөр (мм)</label>
                <input style={inp} type="number" value={customH} onFocus={e => e.target.select()} onChange={e => setCustomH(+e.target.value || 0)} />
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={lbl}>Цаасны жин (гр/м²)</label>
              <select style={inp} value={paperWeight} onChange={e => setPaperWeight(+e.target.value)}>
                {PAPER_WEIGHTS.map(w => <option key={w} value={w}>{w} гр/м² — ₮{PAPER_PRICES[w]}/хуудас</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Ирмэгийн зай (мм)</label>
              <input style={inp} type="number" value={marginMm} onFocus={e => e.target.select()} onChange={e => setMarginMm(+e.target.value || 0)} />
            </div>
          </div>

          {/* Хавтас */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: hascover ? 10 : 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: C.textMid }}>
              <input type="checkbox" checked={hascover} onChange={e => setHascover(e.target.checked)}
                style={{ accentColor: C.accent }} />
              Хавтас (тусдаа цаас)
            </label>
          </div>
          {hascover && (
            <div>
              <label style={lbl}>Хавтасны цаасны жин (гр/м²)</label>
              <select style={inp} value={coverWeight} onChange={e => setCoverWeight(+e.target.value)}>
                {PAPER_WEIGHTS.map(w => <option key={w} value={w}>{w} гр/м² — ₮{PAPER_PRICES[w]}/хуудас</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Хэвлэлтийн тохиргоо */}
        <div style={card}>
          <div style={sectionTitle}><span>🎨</span> Хэвлэлтийн тохиргоо</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={lbl}>Өнгө</label>
              <select style={inp} value={colorOption} onChange={e => setColorOption(e.target.value)}>
                {COLOR_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Нийт нүүрийн тоо</label>
              <input style={inp} type="number" value={pages} onFocus={e => e.target.select()} onChange={e => setPages(+e.target.value || 0)} />
            </div>
          </div>
          <div>
            <label style={lbl}>Нийт ширхэг</label>
            <input style={inp} type="number" value={qty} onFocus={e => e.target.select()} onChange={e => setQty(+e.target.value || 0)} />
          </div>
        </div>

        {/* Хэвлэлтийн дараах боловсруулалт */}
        <div style={card}>
          <div style={sectionTitle}><span>⚙️</span> Боловсруулалт</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
            {POST_PROCESS.map(p => (
              <button key={p.id} className="post-btn"
                onClick={() => togglePost(p.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 10px', background: postEnabled[p.id] ? C.accentGlow : C.bg,
                  border: `1.5px solid ${postEnabled[p.id] ? C.accent : C.border}`,
                  borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: 500,
                  color: postEnabled[p.id] ? C.accent : C.textMid, transition: 'all .15s',
                }}>
                <span>{p.label}</span>
                {postEnabled[p.id] && <span style={{ fontSize: 10, opacity: .7 }}>✓</span>}
              </button>
            ))}
          </div>
          {/* Идэвхтэй боловсруулалтуудын үнэ засах */}
          {POST_PROCESS.filter(p => postEnabled[p.id]).map(p => (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 12, color: C.textMid, display: 'flex', alignItems: 'center' }}>{p.label}</div>
              <div>
                <input style={{ ...inp, textAlign: 'right' }} type="number" value={postProc[p.id]}
                  onFocus={e => e.target.select()}
                  onChange={e => setPostProc(pp => ({ ...pp, [p.id]: +e.target.value || 0 }))} />
              </div>
            </div>
          ))}
        </div>

        {/* Үнийн тохиргоо */}
        <div style={card}>
          <div style={sectionTitle}><span>💰</span> Үнийн тохиргоо</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              ['Ажиллагааны үнэ (₮)', setupCost, setSetupCost],
              ['Даралтын үнэ (₮)', pressureCost, setPressureCost],
              ['Нэмэгдэл (%)', overhead, setOverhead],
              ['НӨАТ (%)', vat, setVat],
            ].map(([l, v, s]) => (
              <div key={l}>
                <label style={lbl}>{l}</label>
                <input style={inp} type="number" value={v}
                  onFocus={e => e.target.select()}
                  onChange={e => s(+e.target.value || 0)} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Баруун тал: Үр дүн ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px' }}>

        {/* Metric cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { l: 'Нийт дүн', v: fmtU(result.total), sub: `${qty.toLocaleString()} ш`, color: C.accent },
            { l: 'Нэгж өртөг', v: `₮${result.unitCost.toFixed(1)}`, sub: 'нэг ширхэг', color: C.purple },
            { l: 'Үр ашиг', v: `${result.efficiency.toFixed(1)}%`, sub: `${result.perSheet}ш/хуудас`, color: C.success },
          ].map(m => (
            <div key={m.l} style={{
              background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`,
              padding: '16px 18px', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: m.color,
              }} />
              <div style={{ fontSize: 11, color: C.textMid, marginBottom: 6, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase' }}>{m.l}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: m.color, letterSpacing: '-1px', lineHeight: 1 }}>{m.v}</div>
              <div style={{ fontSize: 11, color: C.textDim, marginTop: 5 }}>{m.sub}</div>
            </div>
          ))}
        </div>

        {/* Байршуулалт + Зардлын задаргаа */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

          {/* Layout */}
          <div style={{ ...card, marginBottom: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 14 }}>Байршуулалтын зураг</div>
            <LayoutVis
              cols={result.cols} rows={result.rows}
              pW={result.pw} pH={result.ph}
              masterW={MASTER_W} masterH={MASTER_H}
              margin={marginMm} gap={gapMm}
            />
            <div style={{ marginTop: 10, fontSize: 11, color: C.textMid }}>
              А0 хуудаст {result.cols}×{result.rows} = <strong style={{ color: C.text }}>{result.perSheet}ш</strong>
            </div>
          </div>

          {/* Breakdown */}
          <div style={{ ...card, marginBottom: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 14 }}>Зардлын задаргаа</div>
            {result.breakdown.map(({ l, v }) => (
              <div key={l} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 0', borderBottom: `1px solid ${C.border}`, fontSize: 12,
              }}>
                <span style={{ color: C.textMid }}>{l}</span>
                <span style={{ color: v > 0 ? C.text : C.textDim, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {v > 0 ? `₮${fmt(v)}` : '—'}
                </span>
              </div>
            ))}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: C.accentGlow, border: `1px solid ${C.accentDim}`,
              borderRadius: 9, padding: '11px 14px', marginTop: 10,
            }}>
              <span style={{ fontSize: 13, color: C.accent, fontWeight: 700 }}>Нийт дүн</span>
              <span style={{ fontSize: 22, color: C.accent, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                ₮{fmt(result.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Цаасны дэлгэрэнгүй хүснэгт */}
        <div style={card}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 14 }}>Техникийн дэлгэрэнгүй</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <tbody>
              {[
                ['Бүтээгдэхүүний хэмжээ', `${result.pw}×${result.ph}мм`],
                ['А0 хуудасны багтаамж', `${result.cols}×${result.rows} = ${result.perSheet}ш`],
                ['Дотоод хуудас (А0)', `${result.innerSheets.toLocaleString()}`],
                ['Хавтасны хуудас (А0)', hascover ? `${result.coverSheets.toLocaleString()}` : '—'],
                ['Нийт А0 хуудас', `${result.totalSheets.toLocaleString()}`],
                ['Нийт цаасны зардал', `₮${fmt(result.totalPaperCost)}`],
                ['Офсет хавтан', printMethod === 'offset' ? `₮${fmt(result.plateCost)}` : '—'],
              ].map(([k, v]) => (
                <tr key={k} className="calc-row">
                  <td style={{ padding: '7px 8px', color: C.textMid, borderBottom: `1px solid ${C.border}` }}>{k}</td>
                  <td style={{ padding: '7px 8px', color: C.text, fontWeight: 600, textAlign: 'right', borderBottom: `1px solid ${C.border}` }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Үнийн санал товч */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[0.2, 0.3, 0.4].map(margin => {
            const price = result.total * (1 + margin)
            const unit = qty > 0 ? price / qty : 0
            return (
              <div key={margin} style={{
                background: C.surface, borderRadius: 10, border: `1px solid ${C.border}`,
                padding: '14px 16px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 10, color: C.textDim, fontWeight: 700, marginBottom: 6, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                  {(margin * 100).toFixed(0)}% ашигтай
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.teal, letterSpacing: '-1px' }}>
                  ₮{fmt(price)}
                </div>
                <div style={{ fontSize: 11, color: C.textDim, marginTop: 4 }}>
                  нэгж: ₮{unit.toFixed(1)}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ marginTop: 14, fontSize: 11, color: C.textDim, textAlign: 'center' }}>
          Тооцоо хадгалахын тулд "Хадгалах" товч дарна уу
        </div>
        <button style={{
          width: '100%', marginTop: 10, padding: '13px',
          background: C.accent, color: 'white', border: 'none',
          borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
          boxShadow: `0 4px 24px ${C.accentGlow}`, letterSpacing: '-.2px',
        }}>
          ↓ Тооцоог хадгалах
        </button>
      </div>
    </div>
  )
}

// ── Layout Visualizer ─────────────────────────────────────────
function LayoutVis({ cols, rows, pW, pH, masterW, masterH, margin, gap }) {
  const maxW = 200, maxH = 150
  const scale = Math.min(maxW / masterW, maxH / masterH, 1)
  const vw = Math.round(masterW * scale)
  const vh = Math.round(masterH * scale)
  const sm = Math.round(margin * scale)
  const sw = Math.max(1, Math.round(pW * scale))
  const sh = Math.max(1, Math.round(pH * scale))
  const sg = Math.round(gap * scale)
  const items = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      items.push({ x: sm + c * (sw + sg), y: sm + r * (sh + sg), n: r * cols + c + 1 })

  return (
    <div style={{
      position: 'relative', background: '#05080f',
      border: `1.5px solid ${C.borderHover}`, borderRadius: 6,
      width: vw, height: vh, flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', left: sm, top: sm, right: sm, bottom: sm,
        border: `1px dashed ${C.borderHover}`, borderRadius: 2, pointerEvents: 'none',
      }} />
      {items.map(({ x, y, n }) => (
        <div key={n} style={{
          position: 'absolute', left: x, top: y, width: sw, height: sh,
          background: C.accentGlow, border: `0.5px solid ${C.accentDim}`, borderRadius: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: Math.max(5, Math.min(8, sw / 3)), color: C.accent, fontWeight: 700,
        }}>
          {sw > 12 && sh > 10 ? n : ''}
        </div>
      ))}
    </div>
  )
}