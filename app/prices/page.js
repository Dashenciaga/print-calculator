'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { DEFAULT_PRICES, MAX_PAPERS, normalizePrices, newPaperId } from '@/lib/priceSettings'

const GROUPS = [
  {
    title: 'Хэвлэл',
    hint: 'Офсет болон дижитал хэвлэлийн үндсэн тариф.',
    fields: [
      ['platePrice',        'Төмөр (плита)',            '₮ / ш'],
      ['pressPrice',        'Офсет даралт',             '₮ / ажил'],
      ['pressPriceBooklet', 'Офсет даралт, сэтгүүл/ном', '₮ / ажил'],
      ['digitalPrice',      'Дижитал хэвлэл',           '₮ / хуудас'],
    ],
  },
  {
    title: 'Хадаас',
    hint: 'Тохируулга, гологдолд зориулж нэмж хэвлэх хуудасны тоо.',
    fields: [
      ['waste',        'Офсет',   'хуудас'],
      ['wasteDigital', 'Дижитал', 'хуудас'],
    ],
  },
  {
    title: 'Нугалаа, огтлоо',
    hint: 'Нугалаа захиалгын тоогоор үржинэ. Огтлоо захиалга бүрд нэг удаа нэмэгдэнэ.',
    fields: [
      ['foldBifold',  'Нугалаа, бифолд',  '₮ / ш'],
      ['foldTrifold', 'Нугалаа, трифолд', '₮ / ш'],
      ['cut',         'Огтлоо',           '₮ / захиалга'],
    ],
  },
  {
    title: 'Боловсруулалтын анхны дүн',
    hint: 'Шинэ тооцоо эхлэхэд автоматаар тавигдана. Тухайн тооцоон дээрээ өөрчилж болно. 0 бол хоосон.',
    fields: [
      ['glue',  'Бүрэлт', '₮ / захиалга'],
      ['lak',   'Лак',    '₮ / захиалга'],
      ['holio', 'Холио',  '₮ / захиалга'],
      ['tigel', 'Тигель', '₮ / захиалга'],
      ['udees', 'Үдээс',  '₮ / захиалга'],
    ],
  },
  {
    title: 'Ашиг',
    hint: 'Өртөг дээр нэмэгдэх анхны хувь.',
    fields: [['profit', 'Ашгийн нэмэгдэл', '%']],
  },
]

const s = {
  page: { minHeight: '100vh', background: '#f4f5f7', fontFamily: 'var(--app-font)' },
  topbar: { background: 'white', borderBottom: '0.5px solid #e2e8f0', padding: '0 24px', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 5 },
  tbName: { fontSize: 14, fontWeight: 600, color: '#1a1f36' },
  tbBack: { padding: '6px 14px', background: 'transparent', border: '0.5px solid #e2e8f0', borderRadius: 7, fontSize: 12, color: '#64748b', cursor: 'pointer' },
  content: { maxWidth: 720, margin: '0 auto', padding: '28px 24px 110px' },
  heading: { fontSize: 22, fontWeight: 700, color: '#1a1f36', letterSpacing: '-.4px', marginBottom: 4 },
  sub: { fontSize: 14, color: '#64748b', marginBottom: 20 },
  card: { background: 'white', borderRadius: 12, border: '0.5px solid #e2e8f0', padding: 20, marginBottom: 12 },
  cardTitle: { fontSize: 12, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em' },
  cardHint: { fontSize: 12, color: '#94a3b8', margin: '4px 0 14px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 12, fontWeight: 500, color: '#374151' },
  inputWrap: { display: 'flex', alignItems: 'center', border: '1.5px solid #e2e8f0', borderRadius: 9, background: 'white', overflow: 'hidden' },
  input: { flex: 1, minWidth: 0, padding: '9px 10px', fontSize: 14, border: 'none', outline: 'none', color: '#1a1f36', background: 'transparent', textAlign: 'right' },
  unit: { fontSize: 11, color: '#94a3b8', padding: '0 10px 0 2px', whiteSpace: 'nowrap' },
  paperRow: { display: 'grid', gridTemplateColumns: '1fr 150px 34px', gap: 8, marginBottom: 8, alignItems: 'center' },
  paperHead: { display: 'grid', gridTemplateColumns: '1fr 150px 34px', gap: 8, marginBottom: 6, fontSize: 11, color: '#94a3b8' },
  textInput: { padding: '9px 12px', fontSize: 14, border: '1.5px solid #e2e8f0', borderRadius: 9, outline: 'none', color: '#1a1f36', width: '100%', boxSizing: 'border-box' },
  delBtn: { width: 34, height: 38, border: '0.5px solid #e2e8f0', borderRadius: 8, background: '#f8f9fb', color: '#94a3b8', cursor: 'pointer', fontSize: 14 },
  addBtn: { padding: '8px 14px', border: '0.5px dashed #a5b4fc', borderRadius: 8, background: '#eef2ff', color: '#4f46e5', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  bar: { position: 'fixed', left: 0, right: 0, bottom: 0, background: 'white', borderTop: '0.5px solid #e2e8f0', padding: '12px 24px', zIndex: 6 },
  barIn: { maxWidth: 720, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 },
  saveBtn: ok => ({ padding: '11px 28px', background: ok ? '#10b981' : '#4f46e5', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }),
  resetBtn: { padding: '11px 16px', background: 'transparent', color: '#64748b', border: '0.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, cursor: 'pointer' },
  msg: err => ({ fontSize: 12, color: err ? '#dc2626' : '#64748b', flex: 1 }),
  loading: { minHeight: '100vh', background: '#f4f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontFamily: 'var(--app-font)' },
}

function NumberField({ label, unit, value, onChange }) {
  return (
    <div style={s.field}>
      <label style={s.label}>{label}</label>
      <div style={s.inputWrap}>
        <input type="number" min={0} inputMode="decimal" style={s.input} value={value}
          onFocus={e => e.target.select()} onChange={e => onChange(e.target.value)} />
        <span style={s.unit}>{unit}</span>
      </div>
    </div>
  )
}

export default function PricesPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [form, setForm] = useState(null)       // талбарууд string байж болно (бичиж байх үед)
  const [updatedAt, setUpdatedAt] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUser(user)
      const { data, error } = await supabase
        .from('price_settings').select('data, updated_at').eq('user_id', user.id).maybeSingle()
      if (error) setError('Хадгалсан үнийг ачаалж чадсангүй. Доорх нь анхны утга.')
      setForm(normalizePrices(data?.data))
      setUpdatedAt(data?.updated_at || null)
    }
    init()
  }, [router])

  // Хадгалаагүй өөрчлөлттэй хуудсыг хаахад анхааруулна
  useEffect(() => {
    if (!dirty) return
    const warn = e => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  function touch() { setDirty(true); setSaved(false); setError('') }
  function setField(key, val) { setForm(f => ({ ...f, [key]: val })); touch() }
  function setPaper(id, key, val) {
    setForm(f => ({ ...f, papers: f.papers.map(p => p.id === id ? { ...p, [key]: val } : p) })); touch()
  }
  function addPaper() {
    setForm(f => f.papers.length >= MAX_PAPERS ? f
      : { ...f, papers: [...f.papers, { id: newPaperId(f.papers), name: '', price: '' }] })
    touch()
  }
  function removePaper(id) {
    setForm(f => ({ ...f, papers: f.papers.filter(p => p.id !== id) })); touch()
  }
  function resetDefaults() {
    if (!window.confirm('Бүх үнийг анхны утга руу буцаах уу? «Хадгалах» дарах хүртэл хадгалагдахгүй.')) return
    setForm(normalizePrices(DEFAULT_PRICES)); touch()
  }

  async function save() {
    if (!user || saving) return
    if (!form.papers.some(p => String(p.name).trim())) {
      setError('Дор хаяж нэг цаасны нэр оруулна уу.'); return
    }
    setSaving(true); setError('')
    try {
      const clean = normalizePrices(form)
      const now = new Date().toISOString()
      const supabase = createClient()
      const { error } = await supabase.from('price_settings')
        .upsert({ user_id: user.id, data: clean, updated_at: now }, { onConflict: 'user_id' })
      if (error) { setError('Хадгалж чадсангүй. Дахин оролдоно уу.'); return }
      setForm(clean); setUpdatedAt(now); setDirty(false); setSaved(true)
    } catch {
      setError('Сүлжээний алдаа. Дахин оролдоно уу.')
    } finally { setSaving(false) }
  }

  function back() {
    if (dirty && !window.confirm('Хадгалаагүй өөрчлөлт байна. Гарах уу?')) return
    router.push('/dashboard')
  }

  if (!form) return <div style={s.loading}>Ачааллаж байна...</div>

  return (
    <div style={s.page}>
      <div style={s.topbar}>
        <span style={s.tbName}>PrintCalc Pro</span>
        <button style={s.tbBack} onClick={back}>← Тооцоолуур</button>
      </div>

      <div style={s.content}>
        <div style={s.heading}>Үнийн тохиргоо</div>
        <div style={s.sub}>
          Өөрийн компанийн үнийг нэг удаа оруулаад хадгална. Тооцоолуур эдгээр үнээр ажиллана. Үнэ өөрчлөгдөхөд эндээс засна.
        </div>

        <div style={s.card}>
          <div style={s.cardTitle}>Цаас</div>
          <div style={s.cardHint}>Хэрэглэдэг цаас бүрээ А0 хуудасны нэгж үнэтэй нь оруулна. Тооцоолуурт жагсаалтаас сонгоно.</div>
          <div style={s.paperHead}><span>Цаасны нэр</span><span style={{ textAlign: 'right' }}>А0 нэгж үнэ</span><span /></div>
          {form.papers.map(p => (
            <div key={p.id} style={s.paperRow}>
              <input type="text" maxLength={60} placeholder="Жишээ: Цагаан цаас 80гр" style={s.textInput}
                value={p.name} onChange={e => setPaper(p.id, 'name', e.target.value)} />
              <div style={s.inputWrap}>
                <input type="number" min={0} inputMode="decimal" style={s.input} value={p.price}
                  onFocus={e => e.target.select()} onChange={e => setPaper(p.id, 'price', e.target.value)} />
                <span style={s.unit}>₮</span>
              </div>
              <button type="button" style={s.delBtn} title="Устгах" aria-label={`${p.name || 'Цаас'} устгах`}
                disabled={form.papers.length <= 1} onClick={() => removePaper(p.id)}>✕</button>
            </div>
          ))}
          {form.papers.length < MAX_PAPERS &&
            <button type="button" style={s.addBtn} onClick={addPaper}>+ Цаас нэмэх</button>}
        </div>

        {GROUPS.map(g => (
          <div key={g.title} style={s.card}>
            <div style={s.cardTitle}>{g.title}</div>
            <div style={s.cardHint}>{g.hint}</div>
            <div style={s.grid}>
              {g.fields.map(([key, label, unit]) => (
                <NumberField key={key} label={label} unit={unit} value={form[key]} onChange={v => setField(key, v)} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={s.bar}>
        <div style={s.barIn}>
          <div style={s.msg(!!error)}>
            {error || (dirty ? 'Хадгалаагүй өөрчлөлт байна'
              : updatedAt ? `Сүүлд хадгалсан: ${new Date(updatedAt).toLocaleString('mn-MN')}`
              : 'Одоогоор анхны утгаар ажиллаж байна')}
          </div>
          <button type="button" style={s.resetBtn} onClick={resetDefaults}>Анхны утга</button>
          <button type="button" style={s.saveBtn(saved)} onClick={save} disabled={saving}>
            {saving ? 'Хадгалж байна...' : saved ? '✓ Хадгалагдлаа' : 'Хадгалах'}
          </button>
        </div>
      </div>
    </div>
  )
}
