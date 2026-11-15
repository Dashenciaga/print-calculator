import { describe, it, expect } from 'vitest'
import { DEFAULT_PRICES, normalizePrices, productRates, newPaperId, MAX_PAPERS } from './priceSettings'

describe('normalizePrices', () => {
  it('хоосон → анхны утга', () => {
    expect(normalizePrices(null)).toEqual(DEFAULT_PRICES)
    expect(normalizePrices({})).toEqual(DEFAULT_PRICES)
  })

  it('хадгалсан утгыг авч, дутууг нөхнө', () => {
    const p = normalizePrices({ platePrice: 4500, cut: 0, papers: [{ id: 'a', name: ' Цагаан 80гр ', price: '950' }] })
    expect(p.platePrice).toBe(4500)
    expect(p.cut).toBe(0)                      // 0 бол хүчинтэй үнэ
    expect(p.pressPrice).toBe(DEFAULT_PRICES.pressPrice)
    expect(p.papers).toEqual([{ id: 'a', name: 'Цагаан 80гр', price: 950 }])
  })

  it('буруу тоог анхны утгаар солино', () => {
    const p = normalizePrices({ platePrice: -5, pressPrice: 'abc', digitalPrice: '', waste: NaN, profit: 5000 })
    expect(p.platePrice).toBe(DEFAULT_PRICES.platePrice)
    expect(p.pressPrice).toBe(DEFAULT_PRICES.pressPrice)
    expect(p.digitalPrice).toBe(DEFAULT_PRICES.digitalPrice)
    expect(p.waste).toBe(DEFAULT_PRICES.waste)
    expect(p.profit).toBe(1000)
  })

  it('нэргүй цаасыг хасна, бүгд хоосон бол анхны цаас', () => {
    expect(normalizePrices({ papers: [{ name: '  ', price: 5 }] }).papers).toEqual(DEFAULT_PRICES.papers)
    expect(normalizePrices({ papers: 'x' }).papers).toEqual(DEFAULT_PRICES.papers)
  })

  it('давхцсан id-г ялгана, тоог хязгаарлана', () => {
    const many = Array.from({ length: MAX_PAPERS + 20 }, () => ({ id: 'same', name: 'A', price: 1 }))
    const p = normalizePrices({ papers: many }).papers
    expect(p.length).toBe(MAX_PAPERS)
    expect(new Set(p.map(x => x.id)).size).toBe(MAX_PAPERS)
  })

  it('анхны утгыг өөрчлөхгүй', () => {
    const p = normalizePrices({})
    p.papers[0].price = 99999
    expect(DEFAULT_PRICES.papers[0].price).toBe(1200)
  })
})

describe('productRates', () => {
  const prices = normalizePrices({ platePrice: 4000, pressPrice: 45000, pressPriceBooklet: 60000, waste: 80, wasteDigital: 10, foldBifold: 60, foldTrifold: 120 })

  it('офсет ердийн', () => {
    expect(productRates('poster', { dig: false }, prices)).toEqual({ plate: 4000, press: 45000, waste: 80, fold: 0 })
  })
  it('сэтгүүл өөр даралттай', () => {
    expect(productRates('booklet', { dig: false }, prices).press).toBe(60000)
  })
  it('дижитал төмөр, даралтгүй, өөр хадаастай', () => {
    expect(productRates('flyer', { dig: true }, prices)).toEqual({ plate: 0, press: 0, waste: 10, fold: 0 })
  })
  it('нугалаа', () => {
    expect(productRates('bifold', { dig: false }, prices).fold).toBe(60)
    expect(productRates('trifold', { dig: false }, prices).fold).toBe(120)
  })
})

describe('newPaperId', () => {
  it('давхцахгүй', () => {
    expect(newPaperId([{ id: 'p2' }])).toBe('p3')
    expect(newPaperId([{ id: 'p1' }, { id: 'p3' }])).toBe('p4')
    expect(newPaperId([])).toBe('p1')
  })
})
