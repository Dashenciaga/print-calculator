// ─── Интерфейсүүд ────────────────────────────────────────────────────────────

export interface PaperInput {
  unitPrice:          number   // А0 цаасны нэгж үнэ (₮)
  quantity:           number   // Хэвлэх ширхэг
  spoilage:           number   // Хадаасны цаас (нэмэлт ш)
  sides:              number   // Хэвлэх нүүрийн тоо (1, 2, 4 г.м)
  perA3:              number   // Нэг А3-д багтах бүтээгдэхүүний тоо
  perA0:              number   // Нэг А0-с гарах А3-ийн тоо
  spoilageMultiplier?: number  // Хадаасны коэффициент (default=1)
}

export interface PaperResult {
  printSheets: number  // Хэвлэх цаасны тоо (А3)
  a0Sheets:    number  // Шаардагдах А0 цаасны тоо
  paperCost:   number  // Цаасны нийт үнэ (₮)
}

// ─── А0-с гарах А3 стандарт утга ─────────────────────────────────────────────

export const PER_A0_DEFAULTS: Record<string, number> = {
  'B3':     5,
  'A3':     8,
  'A2':     4,
  'A1':     2,
  'A0':     1,
  '210×75': 10,
}

// ─── А3-д багтах ердийн утга ──────────────────────────────────────────────────

export const PER_A3_DEFAULTS: Record<string, number> = {
  'Постер':          1,
  'Брошур бифолд':   8,
  'Брошур трифолд':  4,
  'Флайер 99×210':   12,
}

// ─── Цаасны үнэ тооцоолох цэвэр функц ────────────────────────────────────────

export function calculatePaperCost(input: PaperInput): PaperResult {
  const {
    unitPrice,
    quantity,
    spoilage,
    sides,
    perA3,
    perA0,
    spoilageMultiplier = 1,
  } = input

  if (perA3 <= 0) throw new Error('perA3 тэгээс их байх ёстой')
  if (perA0 <= 0) throw new Error('perA0 тэгээс их байх ёстой')

  // 1. Хэвлэх А3 цаасны тоо
  //    = (ширхэг × нүүр) ÷ А3-д багтах тоо  +  хадаас × коэффициент
  const printSheets = (quantity * sides) / perA3 + spoilage * spoilageMultiplier

  // 2. Шаардагдах А0 цаасны тоо
  const a0Sheets = printSheets / perA0

  // 3. Цаасны нийт үнэ
  const paperCost = unitPrice * a0Sheets

  return { printSheets, a0Sheets, paperCost }
}
