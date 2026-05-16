'use client'
import { useState, useMemo } from 'react'
import { calculatePaperCost, PER_A0_DEFAULTS } from '@/lib/paperCalculator'

const POSTER_SIZES = Object.keys(PER_A0_DEFAULTS)

const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-violet-400 bg-white'
const lbl = 'block text-xs font-medium text-gray-500 mb-1'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={lbl}>{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

export default function PaperCalculator() {
  const [unitPrice, setUnitPrice]   = useState(1200)
  const [quantity,  setQuantity]    = useState(100)
  const [spoilage,  setSpoilage]    = useState(100)
  const [sides,     setSides]       = useState(1)
  const [perA3,     setPerA3]       = useState(1)
  const [perA0,     setPerA0]       = useState(8)
  const [size,      setSize]        = useState('A3')
  const [showSteps, setShowSteps]   = useState(false)

  const result = useMemo(() => {
    try {
      return calculatePaperCost({ unitPrice, quantity, spoilage, sides, perA3, perA0 })
    } catch {
      return null
    }
  }, [unitPrice, quantity, spoilage, sides, perA3, perA0])

  function handleSizeChange(s: string) {
    setSize(s)
    const def = PER_A0_DEFAULTS[s]
    if (def) setPerA0(def)
  }

  const fmt = (n: number) => Math.round(n).toLocaleString()
  const fmtD = (n: number, d = 2) => n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 max-w-xl">
      <h2 className="text-base font-bold text-gray-900 mb-1">Цаасны үнэ тооцоолуур</h2>
      <p className="text-xs text-gray-400 mb-5">А0 цаасан дээр суурилсан тооцоолол</p>

      <div className="space-y-4">

        {/* А0 нэгж үнэ */}
        <Field label="А0 цаасны нэгж үнэ (₮)" hint="Нийлүүлэгчийн үнийн жагсаалтаас авна уу">
          <input type="number" value={unitPrice} className={inp}
            onChange={e => setUnitPrice(+e.target.value || 0)} />
        </Field>

        {/* Ширхэг + хог */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Хэвлэх ширхэг (ш)">
            <input type="number" value={quantity} className={inp}
              onChange={e => setQuantity(+e.target.value || 0)} />
          </Field>
          <Field label="Хадаасны цаас (ш)">
            <input type="number" value={spoilage} className={inp}
              onChange={e => setSpoilage(+e.target.value || 0)} />
          </Field>
        </div>

        {/* Нүүрийн тоо */}
        <Field label="Нүүрийн тоо (sides)" hint="1=нэг тал, 2=хоёр тал, 4=бифолд г.м">
          <div className="flex gap-2">
            {[1, 2, 4, 8].map(s => (
              <button key={s} onClick={() => setSides(s)}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors
                  ${sides === s ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {s}
              </button>
            ))}
          </div>
        </Field>

        {/* perA3 + Хэмжээ → perA0 */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="А3-д багтах тоо" hint="Нэг А3 хуудаст хэдэн ширхэг багтах вэ">
            <input type="number" value={perA3} min={1} className={inp}
              onChange={e => setPerA3(Math.max(1, +e.target.value || 1))} />
          </Field>
          <Field label="Постерийн хэмжээ">
            <select value={size} className={inp} onChange={e => handleSizeChange(e.target.value)}>
              {POSTER_SIZES.map(s => <option key={s}>{s}</option>)}
              <option value="custom">Дурын</option>
            </select>
          </Field>
        </div>

        {/* perA0 */}
        <Field label={`А0-с гарах А3-ийн тоо (perA0 = ${perA0})`}
          hint="Хэмжээ сонгоход автоматаар бөглөгдөнө">
          <input type="number" value={perA0} min={1} className={inp}
            onChange={e => setPerA0(Math.max(1, +e.target.value || 1))} />
        </Field>

        {/* Үр дүн */}
        {result ? (
          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Хэвлэх цаас (А3)</span>
              <span className="font-bold text-gray-800">{fmtD(result.printSheets)} ш</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">А0 цаас шаардагдах</span>
              <span className="font-bold text-gray-800">{fmtD(result.a0Sheets)} ш</span>
            </div>
            <div className="border-t border-violet-200 pt-2 flex justify-between items-center">
              <span className="text-sm font-semibold text-violet-700">Цаасны нийт үнэ</span>
              <span className="text-lg font-bold text-violet-700">₮{fmt(result.paperCost)}</span>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 text-center">
            perA3 болон perA0 тэгээс их байх ёстой
          </div>
        )}

        {/* Алхам алхмаар томьёо */}
        <button onClick={() => setShowSteps(s => !s)}
          className="text-xs text-violet-500 hover:text-violet-700 font-medium w-full text-center py-1">
          {showSteps ? '▲ Томьёо нуух' : '▼ Томьёо харах'}
        </button>

        {showSteps && result && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-xs text-gray-600 space-y-2 font-mono">
            <div className="font-bold text-gray-700 text-xs mb-1 font-sans not-italic">Тооцооллын алхмууд:</div>
            <div>
              <span className="text-gray-400">1. Хэвлэх цаас =</span>
              <span className="text-gray-800"> ({quantity} × {sides}) ÷ {perA3} + {spoilage} × 1</span>
              <span className="text-violet-600"> = {fmtD(result.printSheets)}</span>
            </div>
            <div>
              <span className="text-gray-400">2. А0 цаас =</span>
              <span className="text-gray-800"> {fmtD(result.printSheets)} ÷ {perA0}</span>
              <span className="text-violet-600"> = {fmtD(result.a0Sheets)}</span>
            </div>
            <div>
              <span className="text-gray-400">3. Цаасны үнэ =</span>
              <span className="text-gray-800"> ₮{unitPrice.toLocaleString()} × {fmtD(result.a0Sheets)}</span>
              <span className="text-violet-600"> = ₮{fmt(result.paperCost)}</span>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
