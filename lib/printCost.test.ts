import { describe, it, expect } from 'vitest'
import { bestLayout, fitGrid, calculateJob, type JobInput } from './printCost'

// Excel-ийн "Постер" хуудасны жишээ: A3 постер 100ш, өнгөт офсет
const excelPoster: JobInput = {
  qty: 100, waste: 100, faces: 1, multiPage: false, twoSided: false,
  perSheet: 1, sheetsPerA0: 8, a0Price: 1200,
  digital: false, platePrice: 3500, pressPrice: 50000, digitalPrice: 0,
  finishingFixed: 10000 + 20000, // бүрэлт (J−F)×100 + огтлоо
  profitPct: 30,
}

describe('bestLayout — 1 хуудаст багтах тоо', () => {
  it('B3 хуудсанд нэрийн хуудас 36 ш (хуучин апп 54 гэж нэмж байсан)', () => {
    const l = bestLayout(364, 515, 90, 55)
    expect(l.horizontal.count).toBe(36)  // 4 × 9
    expect(l.vertical.count).toBe(30)    // 5 × 6
    expect(l.perSheet).toBe(36)
  })

  it('B3 хуудсанд A5 → 4 ш (хуучин апп 7)', () => {
    expect(bestLayout(364, 515, 148, 210).perSheet).toBe(4)
  })

  it('A3 хуудсанд A4 → 2 ш (эргүүлж байрлуулна)', () => {
    const l = bestLayout(297, 420, 210, 297)
    expect(l.horizontal.count).toBe(1)
    expect(l.vertical.count).toBe(2)
    expect(l.perSheet).toBe(2)
  })

  it('Хуудаснаас том бүтээгдэхүүн → 0', () => {
    expect(bestLayout(297, 420, 500, 700).perSheet).toBe(0)
  })

  it('0 эсвэл хоосон хэмжээ → 0', () => {
    expect(fitGrid(364, 515, 0, 55).count).toBe(0)
  })
})

describe('calculateJob — Excel-тэй тулгах', () => {
  it('Excel-ийн постерийн жишээ: Z = 124,000₮, 30% → 161,200₮, 1,612₮/ш', () => {
    const r = calculateJob(excelPoster)
    expect(r.totalSheets).toBe(200)   // J
    expect(r.a0Sheets).toBe(25)       // K
    expect(r.paperCost).toBe(30_000)  // L
    expect(r.plates).toBe(4)          // N
    expect(r.plateCost).toBe(14_000)  // P
    expect(r.pressCost).toBe(50_000)  // Q
    expect(r.total).toBe(124_000)     // Z
    expect(r.client).toBeCloseTo(161_200, 6)
    expect(r.unit).toBeCloseTo(1_612, 6)
  })

  it('Захиалгын тоо өсөхөд цаасны зардал өснө (хуучин апп ижил байсан)', () => {
    const a = calculateJob({ ...excelPoster, qty: 100 })
    const b = calculateJob({ ...excelPoster, qty: 1000 })
    expect(b.totalSheets).toBe(1100)
    expect(b.paperCost).toBeGreaterThan(a.paperCost)
    expect(b.total).toBeGreaterThan(a.total)
  })

  it('Хоёр талтай: хэвлэх хуудас ×2, хадаас ×1, төмөр 8', () => {
    const r = calculateJob({ ...excelPoster, twoSided: true })
    expect(r.faces).toBe(2)
    expect(r.totalSheets).toBe(100 * 2 / 1 + 100)
    expect(r.plates).toBe(8)
  })

  it('Олон нүүртэй (16 нүүр) → 4 бүлэг, 32 төмөр', () => {
    const r = calculateJob({ ...excelPoster, multiPage: true, twoSided: true, faces: 16, perSheet: 8 })
    expect(r.plateGroups).toBe(4)
    expect(r.plates).toBe(32)
    expect(r.totalSheets).toBe(100 * 16 / 8 + 100)
  })

  it('Дижитал: төмөргүй, даралт = M × J × тариф', () => {
    const r = calculateJob({ ...excelPoster, digital: true, digitalPrice: 1500, perSheet: 4, waste: 0 })
    expect(r.plates).toBe(0)
    expect(r.totalSheets).toBe(25)
    expect(r.pressCost).toBe(25 * 1500)
  })

  it('Нугалаа захиалгын тоогоор бодогдоно, гараар оруулбал түүнийг авна', () => {
    expect(calculateJob({ ...excelPoster, qty: 500, foldPerUnit: 50 }).foldCost).toBe(25_000)
    expect(calculateJob({ ...excelPoster, qty: 500, foldPerUnit: 50, foldManual: 7_000 }).foldCost).toBe(7_000)
  })

  it('Багтахгүй бол ойлгомжтой алдаа өгнө', () => {
    expect(() => calculateJob({ ...excelPoster, perSheet: 0 })).toThrow('багтахгүй')
  })
})
