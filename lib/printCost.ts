// ─── Хэвлэлийн ажлын өртөг ──────────────────────────────────────────────────
// PRINT_Price_Calculator.xlsx-ийн логикоор:
//   J = E × G / H + F     хэвлэх хуудас (хадаастай)
//   K = J / I             А0 цаас
//   L = D × K             цаасны үнэ
//   N = M × 4 (эсвэл 8)   төмөр (плита)
//   Z = L + P + Q + R…Y   нийт өртөг
//   Үнэ = Z × (1 + ашиг), нэгж үнэ = Үнэ / E

import { calculatePaperCost } from './paperCalculator'

export interface Grid {
  cols:  number
  rows:  number
  count: number
}

export interface Layout {
  horizontal: Grid   // хуудсыг байгаагаар нь
  vertical:   Grid   // хуудсыг 90° эргүүлж (= бүтээгдэхүүнийг эргүүлэх)
  perSheet:   number // аль ихийг нь
}

// Хуваахад гарах 0.999999 мэт алдааг засна
const EPS = 1e-9

/** Хуудсанд бүтээгдэхүүнийг нэг чиглэлд эгнүүлэхэд багтах тоо */
export function fitGrid(sheetW: number, sheetH: number, itemW: number, itemH: number): Grid {
  if (!(sheetW > 0 && sheetH > 0 && itemW > 0 && itemH > 0)) return { cols: 0, rows: 0, count: 0 }
  const cols = Math.floor(sheetW / itemW + EPS)
  const rows = Math.floor(sheetH / itemH + EPS)
  return { cols, rows, count: cols * rows }
}

/**
 * Хоёр чиглэлийн аль ихийг нь авна.
 * Хэвтээ, босоо байрлал бол ӨӨР ӨӨР хувилбар — нэмж болохгүй.
 */
export function bestLayout(sheetW: number, sheetH: number, itemW: number, itemH: number): Layout {
  const horizontal = fitGrid(sheetW, sheetH, itemW, itemH)
  const vertical   = fitGrid(sheetH, sheetW, itemW, itemH)
  return { horizontal, vertical, perSheet: Math.max(horizontal.count, vertical.count) }
}

export interface JobInput {
  qty:            number   // E — захиалгын тоо
  waste:          number   // F — хадаас
  faces:          number   // олон нүүртэй бүтээгдэхүүний нүүрийн тоо
  multiPage:      boolean  // брошур, сэтгүүл гэх мэт олон нүүртэй эсэх
  twoSided:       boolean  // хоёр талтай хэвлэх эсэх
  perSheet:       number   // H — нэг хэвлэх хуудаст багтах тоо
  sheetsPerA0:    number   // I — нэг А0-оос гарах хэвлэх хуудас
  a0Price:        number   // D — А0 цаасны нэгж үнэ
  digital:        boolean
  platePrice:     number   // O — нэг төмрийн үнэ
  pressPrice:     number   // офсет даралтын тариф
  digitalPrice:   number   // дижитал нэг хуудасны үнэ
  finishingFixed: number   // бүрэлт, лак, холио, тигель, үдээс, огтлоо
  foldPerUnit?:   number   // нугалаа ₮/ш (захиалгын тоогоор үржинэ)
  foldManual?:    number | null  // нугалааг гараар оруулсан бол
  profitPct:      number
}

export interface JobResult {
  faces:       number  // G
  printSheets: number  // E × G / H
  totalSheets: number  // J
  a0Sheets:    number  // K
  paperCost:   number  // L
  plateGroups: number  // M
  plates:      number  // N
  plateCost:   number  // P
  pressCost:   number  // Q
  foldCost:    number
  finishing:   number  // R…Y
  total:       number  // Z
  client:      number  // ашигтай үнэ
  unit:        number  // нэгж үнэ
}

export function calculateJob(input: JobInput): JobResult {
  const {
    qty, waste, perSheet, sheetsPerA0, a0Price,
    multiPage, twoSided, digital,
    platePrice, pressPrice, digitalPrice,
    finishingFixed, foldPerUnit = 0, foldManual = null, profitPct,
  } = input

  if (!(perSheet > 0))    throw new Error('Бүтээгдэхүүн хэвлэх хуудсанд багтахгүй байна')
  if (!(sheetsPerA0 > 0)) throw new Error('Нэг А0-оос гарах хуудасны тоо 0-ээс их байх ёстой')

  // G — нүүр: олон нүүртэйд нүүрийн тоо, бусдад 1 эсвэл 2 тал
  const faces = multiPage ? Math.max(1, input.faces) : (twoSided ? 2 : 1)

  // J, K, L — Excel-тэй яг адил томьёо (тестлэгдсэн)
  const paper = calculatePaperCost({
    unitPrice: a0Price,
    quantity:  qty,
    spoilage:  waste,
    sides:     faces,
    perA3:     perSheet,
    perA0:     sheetsPerA0,
  })
  const totalSheets = paper.printSheets
  const printSheets = totalSheets - waste

  // M, N, P — төмөр: CMYK нэг талд 4, хоёр талд 8
  const plateGroups = multiPage ? Math.ceil(faces / 4) : 1
  const plates      = digital ? 0 : plateGroups * (twoSided ? 8 : 4)
  const plateCost   = plates * platePrice

  // Q — даралт
  const pressCost = digital
    ? plateGroups * totalSheets * digitalPrice
    : plateGroups * pressPrice

  // R…Y — боловсруулалт
  const foldCost  = foldManual ?? qty * foldPerUnit
  const finishing = finishingFixed + foldCost

  const total  = paper.paperCost + plateCost + pressCost + finishing
  const client = total * (1 + profitPct / 100)
  const unit   = qty > 0 ? client / qty : 0

  return {
    faces,
    printSheets,
    totalSheets,
    a0Sheets:  paper.a0Sheets,
    paperCost: paper.paperCost,
    plateGroups,
    plates,
    plateCost,
    pressCost,
    foldCost,
    finishing,
    total,
    client,
    unit,
  }
}
