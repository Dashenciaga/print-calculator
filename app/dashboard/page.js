'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const PAPER_SIZES = {
  A4: [210, 297], A3: [297, 420], A5: [148, 210],
  Letter: [216, 279], Legal: [216, 356]
}

export default function Dashboard() {
  const [user, setUser] = useState(null)
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
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')
      else {
        setUser(user)
        loadHistory(user.id)
      }
    }
    getUser()
  }, [])

  useEffect(() => {
    if (paperSize !== 'custom') {
      let [w, h] = PAPER_SIZES[paperSize]
      if (orient === 'landscape') [w, h] = [h, w]
      setPW(w); setPH(h)
    }
  }, [paperSize, orient])

  async function loadHistory(uid) {
    const { data } = await supabase
      .from('calculations')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20)
    if (data) setHistory(data)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const usableW = pW - 2 * margin
  const usableH = pH - 2 * margin
  const cols = mW > 0 ? Math.max(0, Math.floor((usableW + gap) / (mW + gap))) : 0
  const rows = mH > 0 ? Math.max(0, Math.floor((usableH + gap) / (mH + gap))) : 0
  const perSheet = cols * rows
  const sheetsNeeded = perSheet > 0 ? Math.ceil(qty / perSheet) : 0
  const wasteItems = sheetsNeeded * perSheet - qty
  const efficiency = sheetsNeeded * perSheet > 0 ? ((qty / (sheetsNeeded * perSheet)) * 100) : 0
  const printBase = sheetsNeeded * printCost + setupCost
  const overheadAmt = printBase * (overhead / 100)
  const subtotal = printBase + overheadAmt
  const vatAmt = subtotal * (vat / 100)
  const total = subtotal + vatAmt
  const unitCost = qty > 0 ? total / qty : 0

  async function saveCalc() {
    if (!user) return
    const { error } = await supabase.from('calculations').insert({
      user_id: user.id,
      paper_size: paperSize,
      paper_w: pW, paper_h: pH,
      material_w: mW, material_h: mH,
      qty, total: Math.round(total),
      per_sheet: perSheet,
      efficiency: Math.round(efficiency * 10) / 10
    })
    if (!error) {
      loadHistory(user.id)
      setActiveTab('history')
    }
  }

  function PaperVis({ cols, rows, pW, pH, mW, mH, gap, margin }) {
  const maxW = 300, maxH = 200
  const scaleX = maxW / pW, scaleY = maxH / pH
  const scale = Math.min(scaleX, scaleY, 1)
  const vw = Math.round(pW * scale), vh = Math.round(pH * scale)
  const smrg = Math.round(margin * scale)
  const smW = Math.max(1, Math.round(mW * scale))
  const smH = Math.max(1, Math.round(mH * scale))
  const sgap = Math.round(gap * scale)
  const items = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      items.push({ x: smrg + c * (smW + sgap), y: smrg + r * (smH + sgap), n: r * cols + c + 1 })
    }
  }
  return (
    <div className="flex flex-col items-center gap-2 bg-gray-800 rounded-xl p-4 mb-4">
      <p className="text-xs text-gray-400">{pW}×{pH}мм цаасан дээр {cols}×{rows} = {cols*rows} ширхэг</p>
      <div className="relative bg-gray-900 border border-violet-500/30 rounded" style={{width:vw, height:vh}}>
        {items.map(({x,y,n}) => (
          <div key={n} className="absolute border border-violet-500/50 bg-violet-500/10 flex items-center justify-center text-violet-400 font-bold"
            style={{left:x, top:y, width:smW, height:smH, fontSize: Math.max(6, Math.min(10, smW/3))}}>
            {smW > 12 && smH > 8 ? n : ''}
          </div>
        ))}
      </div>
    </div>
  )
}
  const fmt = n => Math.round(n).toLocaleString()

  if (!user) return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-400">Ачааллаж байна...</p>
    </main>
  )

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold">Хэвлэлийн тооцоолуур</h1>
          <p className="text-gray-400 text-xs">{user.email}</p>
        </div>
        <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white transition-colors">
          Гарах →
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 bg-gray-900">
        {['calc', 'result', 'history'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === tab ? 'text-violet-400 border-b-2 border-violet-500' : 'text-gray-400 hover:text-white'}`}>
            {tab === 'calc' ? 'Тооцоо' : tab === 'result' ? 'Үр дүн' : 'Түүх'}
          </button>
        ))}
      </div>

      <div className="max-w-2xl mx-auto p-6">

        {/* CALC TAB */}
        {activeTab === 'calc' && (
          <div className="space-y-4">
            {/* Paper size */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Цаасны хэмжээ</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Стандарт</label>
                  <select value={paperSize} onChange={e => setPaperSize(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                    {Object.keys(PAPER_SIZES).map(s => <option key={s} value={s}>{s}</option>)}
                    <option value="custom">Дурын</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Чиглэл</label>
                  <div className="flex bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                    <button onClick={() => setOrient('portrait')}
                      className={`flex-1 py-2 text-sm transition-colors ${orient === 'portrait' ? 'bg-violet-600 text-white' : 'text-gray-400'}`}>↕ Босоо</button>
                    <button onClick={() => setOrient('landscape')}
                      className={`flex-1 py-2 text-sm transition-colors ${orient === 'landscape' ? 'bg-violet-600 text-white' : 'text-gray-400'}`}>↔ Хэвтээ</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Өргөн (мм)</label>
                  <input type="text" inputMode="numeric" value={pW} onChange={e => setPW(e.target.value === '' ? '' : +e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Өндөр (мм)</label>
                  <input type="text" inputMode="numeric" value={pH} onChange={e => setPH(+e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" onFocus={e => e.target.select()} />
                </div>
              </div>
            </div>

            {/* Material */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Материалын хэмжээ</p>
              <div className="grid grid-cols-2 gap-3">
                {[['Материал өргөн (мм)', mW, setMW], ['Материал өндөр (мм)', mH, setMH],
                  ['Зайлуулах зай (мм)', gap, setGap], ['Ирмэгийн зай (мм)', margin, setMargin]].map(([label, val, setter]) => (
                  <div key={label}>
                    <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                    <input type="text" inputMode="numeric" value={val} onChange={e => setter(+e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                ))}
              </div>
            </div>

            {/* Cost */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Үнийн тохиргоо</p>
              <div className="grid grid-cols-2 gap-3">
                {[['Нийт ширхэг', qty, setQty], ['Ажиллагааны үнэ (₮)', setupCost, setSetupCost],
                  ['Хуудасны үнэ (₮)', printCost, setPrintCost], ['Нэмэгдэл (%)', overhead, setOverhead],
                  ['НӨАТ (%)', vat, setVat]].map(([label, val, setter]) => (
                  <div key={label}>
                    <label className="text-xs text-gray-400 mb-1 block">{label}</label>
                    <input type="text" inputMode="numeric" value={val} onChange={e => setter(+e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white" />
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => setActiveTab('result')}
              className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-3 rounded-xl transition-colors">
              Тооцоолох →
            </button>
          </div>
        )}

        {/* RESULT TAB */}
        {activeTab === 'result' && (
          <div className="space-y-4">
            <PaperVis cols={cols} rows={rows} pW={pW} pH={pH} mW={mW} mH={mH} gap={gap} margin={margin} />
            {/* Metrics */}
            <div className="grid grid-cols-3 gap-3">
              {[
                ['Нэг хуудсанд', perSheet, 'ш'],
                ['Нийт хуудас', fmt(sheetsNeeded), 'хуудас'],
                ['Үр ашиг', efficiency.toFixed(1), '%'],
                ['Баганы тоо', cols, ''],
                ['Мөрийн тоо', rows, ''],
                ['Хаягдал', fmt(wasteItems), 'ш'],
              ].map(([label, val, unit]) => (
                <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-violet-400">{val}<span className="text-xs text-gray-500 ml-1">{unit}</span></p>
                  <p className="text-xs text-gray-400 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="bg-violet-600/20 border border-violet-500/40 rounded-xl p-5">
              <p className="text-sm text-violet-300 mb-1">Нийт үнийн дүн</p>
              <p className="text-4xl font-bold">₮{fmt(total)}</p>
              <p className="text-sm text-gray-400 mt-2">Нэгж өртөг: ₮{unitCost.toFixed(1)}/ш</p>
            </div>

            {/* Breakdown */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
              {[
                ['Хуудасны зардал', `₮${fmt(sheetsNeeded * printCost)}`],
                ['Ажиллагааны зардал', `₮${fmt(setupCost)}`],
                [`Нэмэгдэл (${overhead}%)`, `₮${fmt(overheadAmt)}`],
                [`НӨАТ (${vat}%)`, `₮${fmt(vatAmt)}`],
              ].map(([l, r]) => (
                <div key={l} className="flex justify-between text-sm">
                  <span className="text-gray-400">{l}</span>
                  <span className="text-white">{r}</span>
                </div>
              ))}
            </div>

            <button onClick={saveCalc}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors">
              Хадгалах ↓
            </button>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <p className="text-4xl mb-3">📋</p>
                <p>Хадгалагдсан тооцоо байхгүй</p>
              </div>
            ) : history.map(h => (
              <div key={h.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">{h.paper_size} / {h.material_w}×{h.material_h}мм</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(h.created_at).toLocaleDateString('mn-MN')}</p>
                  </div>
                  <p className="text-violet-400 font-bold text-lg">₮{h.total.toLocaleString()}</p>
                </div>
                <div className="flex gap-2 mt-3">
                  <span className="text-xs bg-gray-800 px-2 py-1 rounded-full text-gray-400">{h.qty?.toLocaleString()} ш</span>
                  <span className="text-xs bg-gray-800 px-2 py-1 rounded-full text-gray-400">{h.per_sheet} ш/хуудас</span>
                  <span className="text-xs bg-gray-800 px-2 py-1 rounded-full text-gray-400">{h.efficiency}% үр ашиг</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}