'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const PAPER_SIZES = {
  A4: [210, 297], A3: [297, 420], A5: [148, 210],
  Letter: [216, 279], Legal: [216, 356]
}

// ── Design tokens ──────────────────────────────────────────────
const C = {
  bg:       '#0f1117',
  surface:  '#161b27',
  surfaceHover: '#1d2436',
  border:   '#232b3e',
  borderLight: '#2e3a52',
  accent:   '#5b73ff',
  accentDim:'#3d52cc',
  accentGlow:'rgba(91,115,255,0.18)',
  success:  '#22d3a5',
  warn:     '#f59e0b',
  danger:   '#f43f5e',
  text:     '#e2e8f4',
  textMid:  '#8b9ab8',
  textDim:  '#4a5a78',
}

const S = {
  shell: {
    display: 'flex', minHeight: '100vh', background: C.bg,
    fontFamily: "'DM Sans', 'Helvetica Neue', sans-serif", color: C.text,
  },
  sidebar: {
    width: 230, background: C.surface, display: 'flex', flexDirection: 'column',
    flexShrink: 0, position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 20,
    borderRight: `1px solid ${C.border}`,
  },
  sbLogo: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '22px 20px 20px', borderBottom: `1px solid ${C.border}`,
  },
  sbIcon: {
    width: 32, height: 32, background: C.accent, borderRadius: 9,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    boxShadow: `0 0 16px ${C.accentGlow}`,
  },
  sbName: { color: C.text, fontSize: 14, fontWeight: 700, letterSpacing: '-.3px' },
  sbVersion: { color: C.textDim, fontSize: 10, marginTop: 1 },
  sbNav: { padding: '16px 0', flex: 1, overflowY: 'auto' },
  sbSection: {
    fontSize: 10, color: C.textDim, fontWeight: 700, letterSpacing: '.1em',
    textTransform: 'uppercase', padding: '10px 20px 6px',
  },
  sbItem: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px',
    fontSize: 13, color: C.textMid, cursor: 'pointer', border: 'none',
    background: 'none', width: '100%', textAlign: 'left',
    transition: 'color .15s, background .15s', borderRadius: 0,
  },
  sbItemActive: {
    background: `linear-gradient(90deg, ${C.accentGlow}, transparent)`,
    color: C.text, borderLeft: `2px solid ${C.accent}`,
  },
  sbUser: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '14px 20px',
    borderTop: `1px solid ${C.border}`, marginTop: 'auto',
  },
  sbAvatar: {
    width: 32, height: 32, borderRadius: '50%', background: C.accent,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: 'white', fontSize: 11, fontWeight: 700, flexShrink: 0,
    border: `2px solid ${C.accentDim}`,
  },
  sbUname: { color: C.text, fontSize: 12, fontWeight: 600, lineHeight: 1.3 },
  sbEmail: { color: C.textDim, fontSize: 10, marginTop: 1 },
  main: { flex: 1, marginLeft: 230, display: 'flex', flexDirection: 'column', minHeight: '100vh' },
  topbar: {
    background: `${C.surface}cc`, backdropFilter: 'blur(12px)',
    borderBottom: `1px solid ${C.border}`, padding: '0 28px',
    height: 56, display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10,
  },
  tbTitle: { fontSize: 15, fontWeight: 700, color: C.text, letterSpacing: '-.3px' },
  tbBreadcrumb: { fontSize: 11, color: C.textDim, marginTop: 1 },
  tbRight: { display: 'flex', alignItems: 'center', gap: 10 },
  tabWrap: {
    display: 'flex', gap: 2, background: C.bg,
    borderRadius: 8, padding: '3px', border: `1px solid ${C.border}`,
  },
  tab: {
    padding: '5px 18px', fontSize: 12, borderRadius: 6, color: C.textMid,
    cursor: 'pointer', border: 'none', background: 'none', fontWeight: 500,
    transition: 'all .15s',
  },
  tabActive: {
    background: C.accentGlow, color: C.accent,
    fontWeight: 700, border: `1px solid ${C.accentDim}`,
  },
  content: { padding: '24px 28px', flex: 1 },

  // Metric cards
  metricsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 },
  metricCard: {
    background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`,
    padding: '16px 18px', position: 'relative', overflow: 'hidden',
    transition: 'border-color .2s',
  },
  mcAccentBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 2,
    background: `linear-gradient(90deg, ${C.accent}, ${C.accentDim})`,
    borderRadius: '12px 12px 0 0',
  },
  mcIcon: {
    width: 28, height: 28, borderRadius: 7, background: C.accentGlow,
    display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  mcLabel: { fontSize: 11, color: C.textMid, marginBottom: 5, fontWeight: 500, letterSpacing: '.02em' },
  mcVal: { fontSize: 26, fontWeight: 800, color: C.text, letterSpacing: '-1px', lineHeight: 1 },
  mcUnit: { fontSize: 12, color: C.textMid, marginLeft: 3, fontWeight: 400 },
  mcSub: { fontSize: 11, color: C.success, marginTop: 5 },

  // Cards
  card: {
    background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`,
    padding: '18px 20px',
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
  },
  cardTitle: { fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: '-.2px' },
  cardBadge: {
    fontSize: 10, background: C.accentGlow, color: C.accent,
    padding: '3px 8px', borderRadius: 20, fontWeight: 600,
  },
  twoCol: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 },

  // Form elements
  fieldRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  fieldRow3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 },
  fieldLabel: {
    display: 'block', fontSize: 11, fontWeight: 600, color: C.textMid,
    marginBottom: 5, letterSpacing: '.03em', textTransform: 'uppercase',
  },
  fieldInput: {
    width: '100%', padding: '9px 12px', fontSize: 13, fontWeight: 500,
    border: `1.5px solid ${C.border}`, borderRadius: 8,
    background: C.bg, color: C.text, outline: 'none',
    boxSizing: 'border-box', transition: 'border-color .15s',
  },
  orientWrap: {
    display: 'flex', background: C.bg, borderRadius: 8, overflow: 'hidden',
    border: `1.5px solid ${C.border}`,
  },
  orientBtn: {
    flex: 1, padding: '9px', fontSize: 12, fontWeight: 600,
    border: 'none', background: 'none', color: C.textMid, cursor: 'pointer',
    transition: 'all .15s',
  },
  orientBtnActive: { background: C.accentGlow, color: C.accent },

  // Breakdown rows
  brRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '9px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13,
  },
  brLabel: { color: C.textMid },
  brVal: { color: C.text, fontWeight: 600, fontVariantNumeric: 'tabular-nums' },
  brTotal: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    background: C.accentGlow, border: `1px solid ${C.accentDim}`,
    borderRadius: 10, padding: '12px 14px', marginTop: 10,
  },
  brTL: { fontSize: 13, color: C.accent, fontWeight: 700 },
  brTV: { fontSize: 20, color: C.accent, fontWeight: 800, fontVariantNumeric: 'tabular-nums' },

  // Buttons
  saveBtn: {
    width: '100%', padding: '11px', background: C.accent,
    color: 'white', border: 'none', borderRadius: 9, fontSize: 13,
    fontWeight: 700, cursor: 'pointer', marginTop: 14,
    boxShadow: `0 0 20px ${C.accentGlow}`, transition: 'opacity .15s',
    letterSpacing: '-.1px',
  },
  calcBtn: {
    width: '100%', padding: '13px', background: C.accent,
    color: 'white', border: 'none', borderRadius: 10, fontSize: 14,
    fontWeight: 700, cursor: 'pointer', marginTop: 12,
    boxShadow: `0 4px 24px ${C.accentGlow}`,
    letterSpacing: '-.2px',
  },
  logoutBtn: {
    padding: '6px 14px', background: 'transparent',
    border: `1px solid ${C.border}`, borderRadius: 7,
    fontSize: 12, color: C.textMid, cursor: 'pointer',
    transition: 'border-color .15s, color .15s',
  },

  // History items
  histItem: {
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 12, padding: '14px 16px', marginBottom: 8,
    transition: 'border-color .2s, background .2s', cursor: 'pointer',
  },
  histTop: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 10,
  },
  histName: { fontSize: 13, fontWeight: 700, color: C.text },
  histDate: { fontSize: 11, color: C.textDim, marginTop: 2 },
  histAmt: {
    fontSize: 15, fontWeight: 800, color: C.accent,
    fontVariantNumeric: 'tabular-nums',
  },
  histTags: { display: 'flex', gap: 6, flexWrap: 'wrap' },
  tag: {
    fontSize: 11, color: C.textMid, background: C.bg,
    padding: '3px 10px', borderRadius: 20, border: `1px solid ${C.border}`,
    fontWeight: 500,
  },
  tagSuccess: {
    fontSize: 11, color: C.success, background: 'rgba(34,211,165,0.08)',
    padding: '3px 10px', borderRadius: 20, border: '1px solid rgba(34,211,165,0.2)',
    fontWeight: 600,
  },

  // Paper vis
  paperVis: {
    background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`,
    padding: 14, display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 10, minHeight: 180,
    justifyContent: 'center',
  },
  visLabel: { fontSize: 11, color: C.textMid, fontWeight: 500 },
  visStats: { display: 'flex', gap: 12, fontSize: 11, color: C.textDim },

  // Toast
  toastWrap: {
    position: 'fixed', bottom: 24, right: 24, zIndex: 999,
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  toast: {
    background: C.surface, border: `1px solid ${C.border}`,
    borderRadius: 10, padding: '12px 16px', fontSize: 13,
    color: C.text, fontWeight: 500, boxShadow: '0 8px 32px rgba(0,0,0,.4)',
    display: 'flex', alignItems: 'center', gap: 10, minWidth: 240,
    animation: 'slideIn .2s ease',
  },
  toastDot: { width: 8, height: 8, borderRadius: '50%', background: C.success, flexShrink: 0 },

  // Divider
  divider: { height: 1, background: C.border, margin: '14px 0' },
  section: { marginBottom: 16 },

  // Stats row in result tab
  effBar: {
    height: 6, background: C.border, borderRadius: 10,
    overflow: 'hidden', marginTop: 6,
  },
  effFill: {
    height: '100%', borderRadius: 10,
    background: `linear-gradient(90deg, ${C.accent}, ${C.success})`,
    transition: 'width .5s ease',
  },

  // Empty state
  empty: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '80px 20px', gap: 12,
    color: C.textDim, textAlign: 'center',
  },
  emptyIcon: { opacity: .3, marginBottom: 4 },
  emptyText: { fontSize: 14, color: C.textMid, fontWeight: 500 },
  emptyHint: { fontSize: 12, color: C.textDim },

  // Selection section select
  sectionSelect: {
    width: '100%', padding: '9px 12px', fontSize: 13, fontWeight: 500,
    border: `1.5px solid ${C.border}`, borderRadius: 8,
    background: C.bg, color: C.text, outline: 'none',
    boxSizing: 'border-box', cursor: 'pointer',
  },

  // Summary / hint boxes
  hintBox: {
    background: C.accentGlow, border: `1px solid ${C.accentDim}`,
    borderRadius: 10, padding: '10px 14px', marginTop: 12,
    fontSize: 12, color: C.accent, lineHeight: 1.6,
  },

  // Scrollbar overrides via class
  histList: { maxHeight: 560, overflowY: 'auto' },
}

// ── Paper Layout Visualizer ────────────────────────────────────
function PaperVis({ cols, rows, pW, pH, mW, mH, gap, margin }) {
  const maxW = 200, maxH = 150
  const scale = Math.min(maxW / pW, maxH / pH, 1)
  const vw = Math.round(pW * scale), vh = Math.round(pH * scale)
  const smrg = Math.round(margin * scale)
  const smW = Math.max(1, Math.round(mW * scale))
  const smH = Math.max(1, Math.round(mH * scale))
  const sgap = Math.round(gap * scale)
  const items = []
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      items.push({ x: smrg + c * (smW + sgap), y: smrg + r * (smH + sgap), n: r * cols + c + 1 })

  return (
    <div style={{
      position: 'relative', background: '#0a0e18',
      border: `1.5px solid ${C.borderLight}`, borderRadius: 6,
      flexShrink: 0, width: vw, height: vh, boxShadow: '0 4px 24px rgba(0,0,0,.4)',
    }}>
      {/* margin guide */}
      <div style={{
        position: 'absolute', left: smrg, top: smrg,
        right: smrg, bottom: smrg,
        border: `1px dashed ${C.borderLight}`, borderRadius: 2, pointerEvents: 'none',
      }} />
      {items.map(({ x, y, n }) => (
        <div key={n} style={{
          position: 'absolute', left: x, top: y, width: smW, height: smH,
          background: C.accentGlow, border: `0.5px solid ${C.accentDim}`,
          borderRadius: 2, display: 'flex', alignItems: 'center',
          justifyContent: 'center',
          fontSize: Math.max(5, Math.min(8, smW / 3)), color: C.accent, fontWeight: 700,
        }}>
          {smW > 12 && smH > 10 ? n : ''}
        </div>
      ))}
    </div>
  )
}

// ── Toast component ────────────────────────────────────────────
function Toast({ toasts }) {
  if (!toasts.length) return null
  return (
    <div style={S.toastWrap}>
      <style>{`@keyframes slideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {toasts.map(t => (
        <div key={t.id} style={{ ...S.toast, ...(t.type === 'error' ? { borderColor: C.danger } : {}) }}>
          <div style={{ ...S.toastDot, background: t.type === 'error' ? C.danger : C.success }} />
          {t.msg}
        </div>
      ))}
    </div>
  )
}

// ── Small bar chart (history overview) ────────────────────────
function MiniChart({ data }) {
  if (!data || data.length < 2) return null
  const vals = data.map(d => d.total || 0)
  const max = Math.max(...vals, 1)
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 40 }}>
      {vals.slice(-12).map((v, i) => (
        <div key={i} style={{
          flex: 1, background: C.accentGlow, borderRadius: 3,
          height: Math.max(4, (v / max) * 40),
          border: `1px solid ${C.accentDim}`, transition: 'height .3s ease',
        }} />
      ))}
    </div>
  )
}

// ── Animated Logo (нүүр хуудасны логотой яг адил) ─────────────
function AnimatedLogo({ size = 32 }) {
  const svgRef = useRef(null)
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const barDefs = [
      {x:8,  baseY:4,  h:46, op:.85, color:'#4f46e5'},
      {x:8,  baseY:58, h:10, op:.35, color:'#4f46e5'},
      {x:21, baseY:4,  h:22, op:.6,  color:'#4f46e5'},
      {x:21, baseY:34, h:42, op:.85, color:'#4f46e5'},
      {x:34, baseY:4,  h:58, op:.9,  color:'#818cf8'},
      {x:34, baseY:70, h:6,  op:.3,  color:'#818cf8'},
      {x:47, baseY:14, h:10, op:.4,  color:'#4f46e5'},
      {x:47, baseY:32, h:34, op:.75, color:'#4f46e5'},
      {x:60, baseY:4,  h:50, op:.55, color:'#4f46e5'},
      {x:60, baseY:62, h:14, op:.3,  color:'#4f46e5'},
    ]
    const ns = 'http://www.w3.org/2000/svg'
    const rects = barDefs.map((b) => {
      const r = document.createElementNS(ns, 'rect')
      r.setAttribute('width', 7)
      r.setAttribute('rx', '3.5')
      r.setAttribute('fill', b.color)
      r.setAttribute('opacity', b.op)
      r.setAttribute('x', b.x)
      r.setAttribute('y', b.baseY)
      r.setAttribute('height', b.h)
      svg.appendChild(r)
      return { el: r, ...b }
    })
    let floatRaf = null
    let t = 0
    const phases = rects.map((_, i) => i * 0.45)
    function loop() {
      t += 0.018
      rects.forEach((r, i) => {
        r.el.setAttribute('y', r.baseY + Math.sin(t + phases[i]) * 2.5)
      })
      floatRaf = requestAnimationFrame(loop)
    }
    floatRaf = requestAnimationFrame(loop)
    return () => { if (floatRaf) cancelAnimationFrame(floatRaf) }
  }, [])
  return <svg ref={svgRef} width={size} height={size} viewBox="0 0 75 80" fill="none" />
}

// ── Main Dashboard ─────────────────────────────────────────────
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
  const [toasts, setToasts] = useState([])
  const [expandedHist, setExpandedHist] = useState(null)
  const router = useRouter()

  const addToast = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const { data: prof } = await supabase.from('profiles').select('*').eq('user_id', user.id).single()
      setProfile(prof)
      loadHistory(user.id)
    }
    init()
  }, [])

  useEffect(() => {
    if (paperSize !== 'custom') {
      let [w, h] = PAPER_SIZES[paperSize]
      if (orient === 'landscape') [w, h] = [h, w]
      setPW(w); setPH(h)
    }
  }, [paperSize, orient])

  async function loadHistory(uid) {
    const supabase = createClient()
    const { data } = await supabase.from('calculations').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(30)
    if (data) setHistory(data)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  // ── Calculations ──────────────────────────────────────────────
  const usableW = pW - 2 * margin, usableH = pH - 2 * margin
  const cols = mW > 0 ? Math.max(0, Math.floor((usableW + gap) / (mW + gap))) : 0
  const rows = mH > 0 ? Math.max(0, Math.floor((usableH + gap) / (mH + gap))) : 0
  const perSheet = cols * rows
  const sheetsNeeded = perSheet > 0 ? Math.ceil(qty / perSheet) : 0
  const wasteItems = sheetsNeeded * perSheet - qty
  const efficiency = sheetsNeeded * perSheet > 0 ? (qty / (sheetsNeeded * perSheet) * 100) : 0
  const printBase = sheetsNeeded * printCost + setupCost
  const overheadAmt = printBase * (overhead / 100)
  const subtotal = printBase + overheadAmt
  const vatAmt = subtotal * (vat / 100)
  const total = subtotal + vatAmt
  const unitCost = qty > 0 ? total / qty : 0

  async function saveCalc() {
    if (!user) return
    setSaving(true)
    try {
      const supabase = createClient()
      await supabase.from('calculations').insert({
        user_id: user.id, paper_size: paperSize,
        paper_w: pW, paper_h: pH, material_w: mW, material_h: mH,
        qty, total: Math.round(total), per_sheet: perSheet,
        efficiency: Math.round(efficiency * 10) / 10,
        setup_cost: setupCost, print_cost: printCost,
        overhead_pct: overhead, vat_pct: vat,
      })
      await loadHistory(user.id)
      addToast('Тооцоо амжилттай хадгалагдлаа')
      setActiveTab('history')
    } catch {
      addToast('Хадгалахад алдаа гарлаа', 'error')
    } finally {
      setSaving(false)
    }
  }

  const fmt = n => Math.round(n).toLocaleString()
  const initials = (profile?.company_name || user?.email || '?').slice(0, 2).toUpperCase()

  // ── History stats ─────────────────────────────────────────────
  const totalSaved = history.reduce((s, h) => s + (h.total || 0), 0)
  const avgEfficiency = history.length
    ? (history.reduce((s, h) => s + (h.efficiency || 0), 0) / history.length).toFixed(1)
    : 0
  const bestEff = history.length
    ? Math.max(...history.map(h => h.efficiency || 0)).toFixed(1)
    : 0

  if (!user) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMid }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: `2px solid ${C.accent}`, borderTopColor: 'transparent', borderRadius: '50%', margin: '0 auto 14px', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{ fontSize: 13 }}>Ачааллаж байна...</div>
      </div>
    </div>
  )

  // Tab labels
  const tabs = [
    { id: 'calc', label: 'Тооцоо', icon: '⊞' },
    { id: 'result', label: 'Үр дүн', icon: '◈' },
    { id: 'history', label: 'Түүх', icon: '◷' },
  ]

  return (
    <div style={S.shell}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        input:focus { border-color: ${C.accent} !important; box-shadow: 0 0 0 3px ${C.accentGlow}; }
        select:focus { border-color: ${C.accent} !important; }
        button:hover { opacity: .88; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 10px; }
        .hist-item:hover { background: ${C.surfaceHover} !important; border-color: ${C.accentDim} !important; }
        .logout-btn:hover { border-color: ${C.textMid} !important; color: ${C.text} !important; }
        .sb-user-btn:hover { background: ${C.surfaceHover} !important; cursor: pointer; }
      `}</style>

      {/* SIDEBAR */}
      <div style={S.sidebar}>
        <div style={S.sbLogo}>
          <div style={{ width: 32, height: 32, borderRadius: 9, flexShrink: 0, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            {profile?.logo_url
              ? <img src={profile.logo_url} alt="logo" style={{ width: 32, height: 32, objectFit: 'cover' }} />
              : <AnimatedLogo size={32} />
            }
          </div>
          <div>
            <div style={S.sbName}>PrintCalc Pro</div>
            <div style={S.sbVersion}>v2.0</div>
          </div>
        </div>

        <div style={S.sbNav}>
          <div style={S.sbSection}>Үндсэн</div>
          {tabs.map(t => (
            <button key={t.id}
              style={{ ...S.sbItem, ...(activeTab === t.id ? S.sbItemActive : {}) }}
              onClick={() => setActiveTab(t.id)}>
              <span style={{ fontSize: 14, opacity: .8 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}

          <div style={{ height: 10 }} />
          <div style={S.sbSection}>Тохиргоо</div>
          <button style={S.sbItem} onClick={() => router.push('/profile')}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            Профайл
          </button>
          <button style={S.sbItem} onClick={() => router.push('/pricing')}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
            Үнийн жагсаалт
          </button>

          {/* Mini history summary in sidebar */}
          {history.length > 0 && (
            <div style={{
              margin: '16px 14px 0',
              background: C.bg, borderRadius: 10, border: `1px solid ${C.border}`, padding: '12px',
            }}>
              <div style={{ fontSize: 10, color: C.textDim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>Сүүлийн тооцоонууд</div>
              <MiniChart data={history} />
              <div style={{ fontSize: 11, color: C.textMid, marginTop: 8 }}>
                Нийт <span style={{ color: C.accent, fontWeight: 700 }}>{history.length}</span> тооцоо
              </div>
            </div>
          )}
        </div>

        <div style={S.sbUser} onClick={() => router.push('/profile')} className="sb-user-btn"
          title="Профайл засах">
          <div style={S.sbAvatar}>
            {profile?.logo_url
              ? <img src={profile.logo_url} alt="logo" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
              : initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ ...S.sbUname, display: 'flex', alignItems: 'center', gap: 5 }}>
              {profile?.company_name || 'Компани'}
            </div>
            <div style={{ ...S.sbEmail, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email?.slice(0, 22)}{user.email?.length > 22 ? '…' : ''}
            </div>
          </div>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke={C.textDim} strokeWidth="2">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </div>

      {/* MAIN */}
      <div style={S.main}>
        {/* TOPBAR */}
        <div style={S.topbar}>
          <div>
            <div style={S.tbTitle}>Хэвлэлийн тооцооллын систем</div>
            <div style={S.tbBreadcrumb}>
              {activeTab === 'calc' && 'Шинэ тооцоо оруулах'}
              {activeTab === 'result' && 'Тооцооллын үр дүн'}
              {activeTab === 'history' && `${history.length} тооцоо хадгалагдсан`}
            </div>
          </div>
          <div style={S.tbRight}>
            <div style={S.tabWrap}>
              {tabs.map(t => (
                <button key={t.id}
                  style={{ ...S.tab, ...(activeTab === t.id ? S.tabActive : {}) }}
                  onClick={() => setActiveTab(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
            <button className="logout-btn" onClick={handleLogout} style={S.logoutBtn}>Гарах</button>
          </div>
        </div>

        <div style={S.content}>

          {/* ── CALC TAB ───────────────────────────────────────── */}
          {activeTab === 'calc' && (
            <div style={{ maxWidth: 700 }}>
              {/* Paper size card */}
              <div style={S.card}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>📄 Цаасны хэмжээ</div>
                </div>
                <div style={S.fieldRow}>
                  <div>
                    <label style={S.fieldLabel}>Стандарт</label>
                    <select style={S.sectionSelect} value={paperSize} onChange={e => setPaperSize(e.target.value)}>
                      {Object.keys(PAPER_SIZES).map(s => <option key={s} value={s}>{s}</option>)}
                      <option value="custom">Дурын хэмжээ</option>
                    </select>
                  </div>
                  <div>
                    <label style={S.fieldLabel}>Чиглэл</label>
                    <div style={S.orientWrap}>
                      <button style={{ ...S.orientBtn, ...(orient === 'portrait' ? S.orientBtnActive : {}) }} onClick={() => setOrient('portrait')}>↕ Босоо</button>
                      <button style={{ ...S.orientBtn, ...(orient === 'landscape' ? S.orientBtnActive : {}) }} onClick={() => setOrient('landscape')}>↔ Хэвтээ</button>
                    </div>
                  </div>
                  <div>
                    <label style={S.fieldLabel}>Өргөн (мм)</label>
                    <input style={S.fieldInput} type="text" inputMode="numeric" value={pW}
                      onFocus={e => e.target.select()} onChange={e => { setPaperSize('custom'); setPW(+e.target.value || 0) }} />
                  </div>
                  <div>
                    <label style={S.fieldLabel}>Өндөр (мм)</label>
                    <input style={S.fieldInput} type="text" inputMode="numeric" value={pH}
                      onFocus={e => e.target.select()} onChange={e => { setPaperSize('custom'); setPH(+e.target.value || 0) }} />
                  </div>
                </div>
              </div>

              {/* Material card */}
              <div style={{ ...S.card, marginTop: 12 }}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>🔲 Материалын хэмжээ</div>
                  <div style={S.cardBadge}>{cols > 0 && rows > 0 ? `${cols}×${rows} = ${perSheet}ш урьдчилсан` : 'тооцоо хийгдэж байна'}</div>
                </div>
                <div style={S.fieldRow}>
                  {[
                    ['Өргөн (мм)', mW, setMW],
                    ['Өндөр (мм)', mH, setMH],
                    ['Зайлуулах зай (мм)', gap, setGap],
                    ['Ирмэгийн зай (мм)', margin, setMargin],
                  ].map(([l, v, s]) => (
                    <div key={l}>
                      <label style={S.fieldLabel}>{l}</label>
                      <input style={S.fieldInput} type="text" inputMode="numeric" value={v}
                        onFocus={e => e.target.select()} onChange={e => s(+e.target.value || 0)} />
                    </div>
                  ))}
                </div>
                {perSheet > 0 && (
                  <div style={S.hintBox}>
                    ✓ {pW}×{pH}мм цааст {mW}×{mH}мм материал <strong>{perSheet} ширхэг</strong> багтана
                    {wasteItems > 0 && ` · ${wasteItems}ш хаягдал`}
                  </div>
                )}
              </div>

              {/* Pricing card */}
              <div style={{ ...S.card, marginTop: 12 }}>
                <div style={S.cardHeader}>
                  <div style={S.cardTitle}>💰 Үнийн тохиргоо</div>
                </div>
                <div style={S.fieldRow3}>
                  {[
                    ['Нийт ширхэг', qty, setQty],
                    ['Ажиллагааны үнэ (₮)', setupCost, setSetupCost],
                    ['Хуудасны үнэ (₮)', printCost, setPrintCost],
                  ].map(([l, v, s]) => (
                    <div key={l}>
                      <label style={S.fieldLabel}>{l}</label>
                      <input style={S.fieldInput} type="text" inputMode="numeric" value={v}
                        onFocus={e => e.target.select()} onChange={e => s(+e.target.value || 0)} />
                    </div>
                  ))}
                </div>
                <div style={S.fieldRow}>
                  <div>
                    <label style={S.fieldLabel}>Нэмэгдэл (%)</label>
                    <input style={S.fieldInput} type="text" inputMode="numeric" value={overhead}
                      onFocus={e => e.target.select()} onChange={e => setOverhead(+e.target.value || 0)} />
                  </div>
                  <div>
                    <label style={S.fieldLabel}>НӨАТ (%)</label>
                    <input style={S.fieldInput} type="text" inputMode="numeric" value={vat}
                      onFocus={e => e.target.select()} onChange={e => setVat(+e.target.value || 0)} />
                  </div>
                </div>
              </div>

              <button style={S.calcBtn} onClick={() => setActiveTab('result')}>
                Тооцоолох → Үр дүн харах
              </button>
            </div>
          )}

          {/* ── RESULT TAB ─────────────────────────────────────── */}
          {activeTab === 'result' && (
            <div style={{ maxWidth: 700 }}>
              {/* Metric cards */}
              <div style={S.metricsGrid}>
                {[
                  { l: 'Нэг хуудсанд', v: perSheet, u: 'ш', icon: '▦' },
                  { l: 'Нийт хуудас', v: fmt(sheetsNeeded), u: 'хуудас', icon: '📋' },
                  { l: 'Үр ашиг', v: efficiency.toFixed(1), u: '%', icon: '◎' },
                  { l: 'Нэгж өртөг', v: '₮' + unitCost.toFixed(1), u: '/ш', icon: '◈' },
                ].map(({ l, v, u, icon }) => (
                  <div key={l} style={S.metricCard}>
                    <div style={S.mcAccentBar} />
                    <div style={S.mcIcon}><span style={{ fontSize: 13 }}>{icon}</span></div>
                    <div style={S.mcLabel}>{l}</div>
                    <div style={S.mcVal}>{v}<span style={S.mcUnit}>{u}</span></div>
                  </div>
                ))}
              </div>

              {/* Efficiency bar */}
              <div style={{ ...S.card, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={S.cardTitle}>Үр ашгийн түвшин</div>
                  <div style={{
                    fontSize: 12, fontWeight: 700, color: efficiency > 80 ? C.success : efficiency > 60 ? C.warn : C.danger,
                  }}>{efficiency.toFixed(1)}%</div>
                </div>
                <div style={S.effBar}>
                  <div style={{ ...S.effFill, width: `${efficiency}%` }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: C.textDim }}>
                  <span>Хаягдал: {wasteItems} ш</span>
                  <span>Хэрэглэгдсэн: {qty.toLocaleString()} ш</span>
                </div>
              </div>

              <div style={S.twoCol}>
                {/* Paper visualization */}
                <div style={S.card}>
                  <div style={S.cardTitle} >Байршуулалтын зураг</div>
                  <div style={{ height: 12 }} />
                  <div style={S.paperVis}>
                    <PaperVis cols={cols} rows={rows} pW={pW} pH={pH} mW={mW} mH={mH} gap={gap} margin={margin} />
                    <div style={S.visLabel}>{pW}×{pH}мм · {cols}×{rows} = {perSheet}ш</div>
                    <div style={S.visStats}>
                      <span>Зай: {gap}мм</span>
                      <span>·</span>
                      <span>Ирмэг: {margin}мм</span>
                    </div>
                  </div>
                </div>

                {/* Cost breakdown */}
                <div style={S.card}>
                  <div style={S.cardTitle}>Зардлын задаргаа</div>
                  <div style={{ height: 12 }} />
                  {[
                    ['Хуудасны зардал', fmt(sheetsNeeded * printCost)],
                    ['Ажиллагааны зардал', fmt(setupCost)],
                    [`Нэмэгдэл (${overhead}%)`, fmt(overheadAmt)],
                    [`НӨАТ (${vat}%)`, fmt(vatAmt)],
                  ].map(([l, v]) => (
                    <div key={l} style={S.brRow}>
                      <span style={S.brLabel}>{l}</span>
                      <span style={S.brVal}>₮{v}</span>
                    </div>
                  ))}
                  <div style={S.brTotal}>
                    <span style={S.brTL}>Нийт дүн</span>
                    <span style={S.brTV}>₮{fmt(total)}</span>
                  </div>
                  <button style={S.saveBtn} onClick={saveCalc} disabled={saving}>
                    {saving ? '⏳ Хадгалж байна...' : '↓ Түүхэнд хадгалах'}
                  </button>
                </div>
              </div>

              {/* Back button */}
              <button onClick={() => setActiveTab('calc')} style={{
                ...S.logoutBtn, padding: '9px 18px', fontSize: 13, marginTop: 4,
              }}>← Тохиргоо засах</button>
            </div>
          )}

          {/* ── HISTORY TAB ────────────────────────────────────── */}
          {activeTab === 'history' && (
            <div style={{ maxWidth: 700 }}>
              {/* Summary stats */}
              {history.length > 0 && (
                <div style={{ ...S.metricsGrid, gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 16 }}>
                  {[
                    { l: 'Нийт тооцоо', v: history.length, u: 'удаа' },
                    { l: 'Нийт дүн', v: '₮' + fmt(totalSaved), u: '' },
                    { l: 'Дундаж үр ашиг', v: avgEfficiency, u: '%' },
                  ].map(({ l, v, u }) => (
                    <div key={l} style={S.metricCard}>
                      <div style={S.mcAccentBar} />
                      <div style={S.mcLabel}>{l}</div>
                      <div style={{ ...S.mcVal, fontSize: 20 }}>{v}<span style={S.mcUnit}>{u}</span></div>
                    </div>
                  ))}
                </div>
              )}

              {history.length === 0 ? (
                <div style={S.empty}>
                  <div style={S.emptyIcon}>
                    <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke={C.textDim} strokeWidth="1">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </div>
                  <div style={S.emptyText}>Хадгалагдсан тооцоо байхгүй байна</div>
                  <div style={S.emptyHint}>Тооцоо хийгээд "Хадгалах" товчийг дарна уу</div>
                  <button onClick={() => setActiveTab('calc')} style={{ ...S.calcBtn, width: 'auto', padding: '10px 24px', marginTop: 8 }}>
                    Тооцоо хийх →
                  </button>
                </div>
              ) : (
                <div style={S.histList}>
                  {history.map(h => (
                    <div key={h.id} className="hist-item" style={S.histItem}
                      onClick={() => setExpandedHist(expandedHist === h.id ? null : h.id)}>
                      <div style={S.histTop}>
                        <div>
                          <div style={S.histName}>{h.paper_size} / {h.material_w}×{h.material_h}мм</div>
                          <div style={S.histDate}>{new Date(h.created_at).toLocaleString('mn-MN')}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={S.histAmt}>₮{h.total?.toLocaleString()}</span>
                          <div style={{ fontSize: 10, color: expandedHist === h.id ? C.accent : C.textDim, marginTop: 2 }}>
                            {expandedHist === h.id ? '▲ хураах' : '▼ дэлгэрэнгүй'}
                          </div>
                        </div>
                      </div>

                      <div style={S.histTags}>
                        <span style={S.tag}>{h.qty?.toLocaleString()} ш</span>
                        <span style={S.tag}>{h.per_sheet} ш/хуудас</span>
                        <span style={h.efficiency >= 85 ? S.tagSuccess : S.tag}>
                          {h.efficiency}% үр ашиг
                        </span>
                      </div>

                      {/* Expanded detail */}
                      {expandedHist === h.id && (
                        <div style={{
                          marginTop: 12, paddingTop: 12,
                          borderTop: `1px solid ${C.border}`,
                          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 20px',
                        }}>
                          {[
                            ['Цаасны хэмжээ', `${h.paper_w}×${h.paper_h}мм`],
                            ['Материал', `${h.material_w}×${h.material_h}мм`],
                            ['Нийт хуудас', `${Math.ceil((h.qty || 0) / (h.per_sheet || 1))} хуудас`],
                            ['Нэгж өртөг', `₮${((h.total || 0) / (h.qty || 1)).toFixed(1)}`],
                          ].map(([k, v]) => (
                            <div key={k} style={{ fontSize: 12 }}>
                              <span style={{ color: C.textDim }}>{k}: </span>
                              <span style={{ color: C.text, fontWeight: 600 }}>{v}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <Toast toasts={toasts} />
    </div>
  )
}