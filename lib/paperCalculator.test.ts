import { describe, it, expect } from 'vitest'
import { calculatePaperCost } from './paperCalculator'

describe('calculatePaperCost', () => {

  it('Тест 1 — B3 постер 100ш', () => {
    const r = calculatePaperCost({
      unitPrice: 1200, quantity: 100, spoilage: 100,
      sides: 1, perA3: 1, perA0: 5,
    })
    expect(r.printSheets).toBe(200)
    expect(r.a0Sheets).toBe(40)
    expect(r.paperCost).toBe(48_000)
  })

  it('Тест 2 — A2 постер 1000ш', () => {
    const r = calculatePaperCost({
      unitPrice: 1200, quantity: 1000, spoilage: 100,
      sides: 1, perA3: 1, perA0: 4,
    })
    expect(r.printSheets).toBe(1100)
    expect(r.a0Sheets).toBe(275)
    expect(r.paperCost).toBe(330_000)
  })

  it('Тест 3 — B5 бифолд брошур 500ш', () => {
    const r = calculatePaperCost({
      unitPrice: 950, quantity: 500, spoilage: 100,
      sides: 4, perA3: 8, perA0: 5,
    })
    expect(r.printSheets).toBe(350)
    expect(r.a0Sheets).toBe(70)
    expect(r.paperCost).toBe(66_500)
  })

  it('Тест 4 — 99×210 флайер 400ш', () => {
    const r = calculatePaperCost({
      unitPrice: 1200, quantity: 400, spoilage: 4,
      sides: 2, perA3: 12, perA0: 8,
    })
    // printSheets = (400×2)/12 + 4 = 66.6̄ + 4 = 70.6̄
    expect(r.printSheets).toBeCloseTo(70.667, 2)
    // a0Sheets = 70.6̄ / 8 = 8.833̄
    expect(r.a0Sheets).toBeCloseTo(8.833, 2)
    // paperCost = 1200 × 8.833̄ = 10,600
    expect(r.paperCost).toBeCloseTo(10_600, 0)
  })

  it('spoilageMultiplier ажиллагаа', () => {
    const r = calculatePaperCost({
      unitPrice: 1000, quantity: 100, spoilage: 50,
      sides: 1, perA3: 1, perA0: 10,
      spoilageMultiplier: 2,
    })
    // printSheets = (100×1)/1 + 50×2 = 100 + 100 = 200
    expect(r.printSheets).toBe(200)
    expect(r.a0Sheets).toBe(20)
    expect(r.paperCost).toBe(20_000)
  })

  it('perA3=0 байвал алдаа өгнө', () => {
    expect(() =>
      calculatePaperCost({ unitPrice:1200, quantity:100, spoilage:0, sides:1, perA3:0, perA0:8 })
    ).toThrow('perA3 тэгээс их байх ёстой')
  })

  it('perA0=0 байвал алдаа өгнө', () => {
    expect(() =>
      calculatePaperCost({ unitPrice:1200, quantity:100, spoilage:0, sides:1, perA3:1, perA0:0 })
    ).toThrow('perA0 тэгээс их байх ёстой')
  })

})
