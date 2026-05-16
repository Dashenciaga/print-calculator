'use client'
import { useState, useMemo } from 'react'

const PER_A0_DEFAULTS = { B3:5, A3:8, A2:4, A1:2, A0:1 }
const PRESS_COSTS     = { B3:40000, A3:50000, A2:100000, A1:150000, A0:200000 }
const SIZES = ['B3','A3','A2','A1','A0','custom']

function calcPoster({ size, unitPrice, quantity, spoilage, sides, perA3, perA0,
  tomorUnit, tigel, lak, holio, nugalaa, naalt, udees }) {
  const printSheets = quantity * (sides / perA3) + spoilage
  const a0Sheets    = printSheets / perA0
  const paperCost   = unitPrice * a0Sheets
  const zuil        = sides
  const tomorTo     = zuil * 4
  const tomorCost   = tomorTo * tomorUnit
  const pressCost   = zuil * (PRESS_COSTS[size] || 50000)
  const buurelt     = sides === 2 ? (printSheets - spoilage) * 100 : 0
  const ogtloo      = 20000
  const total       = paperCost + tomorCost + pressCost + buurelt +
                      tigel + lak + holio + nugalaa + naalt + udees + ogtloo
  return {
    printSheets, a0Sheets, paperCost,
    zuil, tomorTo, tomorCost, pressCost, buurelt,
    tigel, lak, holio, nugalaa, naalt, udees, ogtloo,
    total,
    sell20: total * 1.2,
    sell30: total * 1.3,
    sell40: total * 1.4,
  }
}

const fmt = n => Math.round(n).toLocaleString()
const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-violet-400 bg-white'

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{title}</div>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="font-bold text-gray-800 text-lg">{value}</div>
    </div>
  )
}

export default function PosterCalculator() {
  const [size,      setSize]      = useState('A3')
  const [unitPrice, setUnitPrice] = useState(1200)
  const [quantity,  setQuantity]  = useState(100)
  const [spoilage,  setSpoilage]  = useState(100)
  const [sides,     setSides]     = useState(1)
  const [perA3,     setPerA3]     = useState(1)
  const [perA0,     setPerA0]     = useState(8)
  const [tomorUnit, setTomorUnit] = useState(3850)
  const [tigel,     setTigel]     = useState(0)
  const [lak,       setLak]       = useState(0)
  const [holio,     setHolio]     = useState(0)
  const [nugalaa,   setNugalaa]   = useState(0)
  const [naalt,     setNaalt]     = useState(0)
  const [udees,     setUdees]     = useState(0)

  const result = useMemo(() => calcPoster({
    size, unitPrice, quantity, spoilage, sides, perA3, perA0,
    tomorUnit, tigel, lak, holio, nugalaa, naalt, udees,
  }), [size, unitPrice, quantity, spoilage, sides, perA3, perA0,
       tomorUnit, tigel, lak, holio, nugalaa, naalt, udees])

  function handleSizeChange(s) {
    setSize(s)
    if (PER_A0_DEFAULTS[s]) setPerA0(PER_A0_DEFAULTS[s])
  }

  return (
    <main className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Постер хэвлэлийн үнэ тооцоолуур</h1>
        <p className="text-gray-500 text-sm mb-6">Параметр оруулахад үнэ автоматаар тооцоологдоно</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ===== ЗҮҮН: ОРОЛТ ===== */}
          <div className="space-y-4">

            {/* 1. Цаас */}
            <Section title="📄 Цаас">
              <Field label="Постерийн хэмжээ">
                <select value={size} onChange={e => handleSizeChange(e.target.value)} className={inp}>
                  {SIZES.map(s => <option key={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="А0 цаасны нэгж үнэ (₮)">
                <input type="number" value={unitPrice}
                  onChange={e => setUnitPrice(+e.target.value || 0)} className={inp} />
              </Field>
              <Field label="Хэвлэх тоо ширхэг (ш)">
                <input type="number" value={quantity}
                  onChange={e => setQuantity(+e.target.value || 0)} className={inp} />
              </Field>
              <Field label="Хадаасны цаас / хог (ш)">
                <input type="number" value={spoilage}
                  onChange={e => setSpoilage(+e.target.value || 0)} className={inp} />
              </Field>
              <Field label="Хэвлэх тал">
                <div className="flex gap-2">
                  {[1, 2].map(s => (
                    <button key={s} onClick={() => setSides(s)}
                      className={`flex-1 py-2 rounded-lg font-medium text-sm transition-colors
                        ${sides === s
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {s} тал
                    </button>
                  ))}
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="А3-д багтах тоо">
                  <input type="number" value={perA3} min={1}
                    onChange={e => setPerA3(+e.target.value || 1)} className={inp} />
                </Field>
                <Field label={`А0-д А3 (${PER_A0_DEFAULTS[size] ?? '—'})`}>
                  <input type="number" value={perA0} min={1}
                    onChange={e => setPerA0(+e.target.value || 1)} className={inp} />
                </Field>
              </div>
            </Section>

            {/* 2. Өнгө / Төмөр */}
            <Section title="🎨 Өнгө / Төмөр">
              <Field label="Төмрийн нэгж үнэ (₮)">
                <input type="number" value={tomorUnit}
                  onChange={e => setTomorUnit(+e.target.value || 0)} className={inp} />
              </Field>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 space-y-1">
                <div className="flex justify-between">
                  <span>Өнгө шүүлт (нүүр)</span>
                  <strong className="text-gray-800">{result.zuil}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Төмрийн тоо ({result.zuil}×4)</span>
                  <strong className="text-gray-800">{result.tomorTo} ш</strong>
                </div>
                <div className="flex justify-between">
                  <span>Төмрийн үнэ</span>
                  <strong className="text-gray-800">₮{fmt(result.tomorCost)}</strong>
                </div>
              </div>
            </Section>

            {/* 3. Хэвлэлтийн дараах */}
            <Section title="⚙️ Хэвлэлтийн дараах">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label:'Тигель (₮)',  val:tigel,   set:setTigel },
                  { label:'Лак (₮)',     val:lak,     set:setLak },
                  { label:'Холио (₮)',   val:holio,   set:setHolio },
                  { label:'Нугалаа (₮)', val:nugalaa, set:setNugalaa },
                  { label:'Наалт (₮)',   val:naalt,   set:setNaalt },
                  { label:'Үдээс (₮)',   val:udees,   set:setUdees },
                ].map(({ label, val, set }) => (
                  <Field key={label} label={label}>
                    <input type="number" value={val}
                      onChange={e => set(+e.target.value || 0)} className={inp} />
                  </Field>
                ))}
              </div>
              <p className="text-xs text-gray-400">Огтлоо: ₮20,000 (автомат)</p>
            </Section>
          </div>

          {/* ===== БАРУУН: ҮР ДҮН ===== */}
          <div className="space-y-4">

            {/* Товч мэдээлэл */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Хэвлэх цаас" value={`${fmt(result.printSheets)} ш`} />
              <StatCard label="А0 цаас" value={`${result.a0Sheets.toFixed(1)} ш`} />
            </div>

            {/* Зардлын задаргаа */}
            <Section title="📊 Зардлын задаргаа">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                    <th className="text-left pb-2 font-semibold">Зардлын нэр</th>
                    <th className="text-right pb-2 font-semibold">Дүн (₮)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    ['Цаасны зардал',      result.paperCost],
                    ['Төмрийн зардал',     result.tomorCost],
                    ['Хэвлэлтийн даралт',  result.pressCost],
                    ['Бүрэлт',             result.buurelt],
                    ['Тигель',             result.tigel],
                    ['Лак',                result.lak],
                    ['Холио',              result.holio],
                    ['Нугалаа',            result.nugalaa],
                    ['Наалт',              result.naalt],
                    ['Үдээс',              result.udees],
                    ['Огтлоо',             result.ogtloo],
                  ].map(([label, val]) => (
                    <tr key={label} className={val > 0 ? '' : 'opacity-30'}>
                      <td className="py-2 text-gray-600">{label}</td>
                      <td className="py-2 text-right font-medium text-gray-800">
                        {val > 0 ? `₮${fmt(val)}` : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-200">
                    <td className="py-3 font-bold text-gray-900">Нийт зардал</td>
                    <td className="py-3 text-right font-bold text-violet-600 text-xl">
                      ₮{fmt(result.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Section>

            {/* Зарагдах үнэ */}
            <Section title="💰 Зарагдах үнэ">
              <div className="space-y-3">
                {[
                  { pct:20, total:result.sell20, cls:'bg-green-50 border-green-200 text-green-800' },
                  { pct:30, total:result.sell30, cls:'bg-blue-50 border-blue-200 text-blue-800' },
                  { pct:40, total:result.sell40, cls:'bg-violet-50 border-violet-200 text-violet-800' },
                ].map(({ pct, total, cls }) => (
                  <div key={pct} className={`rounded-xl border p-4 ${cls}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-sm">+{pct}% ашиг</span>
                      <span className="font-bold text-xl">₮{fmt(total)}</span>
                    </div>
                    <div className="text-xs opacity-60 mt-1">
                      Нэгжийн үнэ: ₮{quantity > 0 ? fmt(total / quantity) : 0} / ш
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>
      </div>
    </main>
  )
}
