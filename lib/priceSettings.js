// ─── Компанийн үнийн тохиргоо ───────────────────────────────────────────────
// Үнэ тооцоологч нэг удаа оруулж хадгална, үнэ өөрчлөгдөхөд засна.
// Supabase: price_settings.data (jsonb). Тооцоолуур эндээс анхны утгаа авна.

export const MAX_PAPERS = 60

export const DEFAULT_PRICES = {
  // Цаасны төрөл бүр А0 хуудасны нэгж үнэтэй
  papers: [{ id: 'default', name: 'Цаас', price: 1200 }],

  platePrice:        3850,   // нэг төмөр (плита)
  pressPrice:        40000,  // офсет даралт — ердийн ажил
  pressPriceBooklet: 50000,  // офсет даралт — сэтгүүл/ном
  digitalPrice:      1500,   // дижитал, нэг хуудас

  waste:        100,  // хадаас — офсет (хуудас)
  wasteDigital: 100,  // хадаас — дижитал (хуудас)

  cut:         20000, // огтлоо, нэг захиалга
  foldBifold:  50,    // нугалаа ₮/ш — бифолд
  foldTrifold: 100,   // нугалаа ₮/ш — трифолд

  // Нэг захиалгад автоматаар тавигдах дүн (0 = хоосон)
  glue:  0,  // бүрэлт
  lak:   0,
  holio: 0,
  tigel: 0,
  udees: 0,

  profit: 30, // ашгийн хувь
}

const NUMBER_KEYS = Object.keys(DEFAULT_PRICES).filter(k => k !== 'papers')

function num(v, fallback, max = 1e9) {
  const n = typeof v === 'string' && v.trim() === '' ? NaN : Number(v)
  if (!Number.isFinite(n) || n < 0) return fallback
  return Math.min(n, max)
}

/** Хадгалсан (эсвэл хэрэглэгчийн оруулсан) утгыг цэвэрлэж, дутууг анхны утгаар нөхнө */
export function normalizePrices(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const out = {}

  for (const k of NUMBER_KEYS) {
    out[k] = num(src[k], DEFAULT_PRICES[k], k === 'profit' ? 1000 : 1e9)
  }

  const seen = new Set()
  const papers = (Array.isArray(src.papers) ? src.papers : [])
    .slice(0, MAX_PAPERS)
    .map((p, i) => {
      let id = String(p?.id || `p${i + 1}`).slice(0, 40)
      while (seen.has(id)) id += '_'
      seen.add(id)
      return {
        id,
        name:  String(p?.name ?? '').trim().slice(0, 60),
        price: num(p?.price, 0),
      }
    })
    .filter(p => p.name)

  out.papers = papers.length ? papers : DEFAULT_PRICES.papers.map(p => ({ ...p }))
  return out
}

/** Бүтээгдэхүүний төрлөөс хамаарах тариф */
export function productRates(key, product, prices) {
  const digital = !!product?.dig
  return {
    plate: digital ? 0 : prices.platePrice,
    press: digital ? 0 : (key === 'booklet' ? prices.pressPriceBooklet : prices.pressPrice),
    waste: digital ? prices.wasteDigital : prices.waste,
    fold:  key === 'bifold' ? prices.foldBifold : key === 'trifold' ? prices.foldTrifold : 0,
  }
}

/** Шинэ цаасны мөрөнд давхцахгүй id */
export function newPaperId(papers) {
  const ids = new Set(papers.map(p => p.id))
  let i = papers.length + 1
  while (ids.has(`p${i}`)) i++
  return `p${i}`
}
