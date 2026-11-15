import { describe, it, expect } from 'vitest'
import { isProActive, extendExpiry, makeRefCode, REF_CODE_RE, isValidEmail, mnToday, mnDate } from './billing'

const now = new Date('2026-11-11T09:00:00Z')

describe('isProActive', () => {
  it('free / хоосон → false', () => {
    expect(isProActive(null, now)).toBe(false)
    expect(isProActive({ plan: 'free' }, now)).toBe(false)
    expect(isProActive({ plan: 'pending' }, now)).toBe(false)
  })
  it('хугацаа дуусаагүй pro → true, дууссан → false', () => {
    expect(isProActive({ plan: 'pro', expires_at: '2027-01-01T00:00:00Z' }, now)).toBe(true)
    expect(isProActive({ plan: 'pro', expires_at: '2026-11-01T00:00:00Z' }, now)).toBe(false)
  })
  it('хугацаагүй pro → true', () => {
    expect(isProActive({ plan: 'pro', expires_at: null }, now)).toBe(true)
  })
})

describe('extendExpiry', () => {
  it('эрхгүй бол өнөөдрөөс 12 сар', () => {
    expect(extendExpiry(null, 12, now).toISOString()).toBe('2027-11-11T09:00:00.000Z')
  })
  it('идэвхтэй эрх дээр нэмнэ (сунгалт алдагдахгүй)', () => {
    expect(extendExpiry('2027-03-01T00:00:00Z', 12, now).toISOString()).toBe('2028-03-01T00:00:00.000Z')
  })
  it('дууссан эрх бол өнөөдрөөс', () => {
    expect(extendExpiry('2026-01-01T00:00:00Z', 1, now).toISOString()).toBe('2026-12-11T09:00:00.000Z')
  })
  it('1-р сарын 31 + 1 сар → 2-р сарын сүүлийн өдөр', () => {
    const jan31 = new Date('2027-01-31T00:00:00Z')
    expect(extendExpiry(null, 1, jan31).toISOString().slice(0, 10)).toBe('2027-02-28')
  })
})

describe('makeRefCode', () => {
  it('PC-XXXXXX хэлбэртэй, андуурагдах тэмдэгтгүй', () => {
    for (let i = 0; i < 200; i++) {
      const c = makeRefCode()
      expect(c).toMatch(REF_CODE_RE)
      expect(c.slice(3)).not.toMatch(/[01OIL]/)
    }
  })
  it('өгсөн байтаас тогтмол код', () => {
    expect(makeRefCode(new Uint8Array([0, 1, 2, 3, 4, 5]))).toBe('PC-234567')
  })
})

describe('isValidEmail', () => {
  it('зөв хаяг', () => {
    expect(isValidEmail('bat@company.mn')).toBe(true)
    expect(isValidEmail('a.b+c@mail.co.uk')).toBe(true)
  })
  it('буруу, толгой оруулах оролдлого', () => {
    expect(isValidEmail('bat@company')).toBe(false)
    expect(isValidEmail('bat company@x.mn')).toBe(false)
    expect(isValidEmail('a@b.mn\r\nBcc: x@y.mn')).toBe(false)
    expect(isValidEmail('"x"@y.mn')).toBe(false)
    expect(isValidEmail(null)).toBe(false)
  })
})

describe('Монголын цаг', () => {
  it('UTC 20:00 = Монголд маргааш', () => {
    expect(mnToday(new Date('2026-11-11T20:00:00Z'))).toBe('2026-11-12')
    expect(mnDate('2026-11-11T15:59:00Z')).toBe('2026-11-11')
  })
})
