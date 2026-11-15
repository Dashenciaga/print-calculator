// Төлбөр, Pro эрхийн нийтлэг логик (клиент ба сервер хоёуланд ажиллана)

export const PRO_PRICE  = Number(process.env.NEXT_PUBLIC_PRO_PRICE  || 199000) // ₮
export const PRO_MONTHS = Number(process.env.NEXT_PUBLIC_PRO_MONTHS || 12)

/** Pro эрх идэвхтэй эсэх. expires_at хоосон бол хугацаагүй. */
export function isProActive(sub, now = new Date()) {
  if (!sub || sub.plan !== 'pro') return false
  if (!sub.expires_at) return true
  return new Date(sub.expires_at) > now
}

/** Шинэ дуусах хугацаа: идэвхтэй эрх байвал түүн дээр нэмнэ, үгүй бол өнөөдрөөс. */
export function extendExpiry(currentExpiresAt, months, now = new Date()) {
  const current = currentExpiresAt ? new Date(currentExpiresAt) : null
  const base = current && current > now ? current : now
  const d = new Date(base)
  const day = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + months)
  // 1-р сарын 31 + 1 сар → 2-р сарын сүүлийн өдөр (3-р сар руу үсрэхгүй)
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, lastDay))
  return d
}

// Андуурагдах тэмдэгтгүй (0/O, 1/I/L байхгүй)
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

/** Гүйлгээний утгад бичих код: PC-XXXXXX */
export function makeRefCode(randomBytes) {
  const bytes = randomBytes || crypto.getRandomValues(new Uint8Array(6))
  let s = ''
  for (let i = 0; i < 6; i++) s += ALPHABET[bytes[i] % ALPHABET.length]
  return 'PC-' + s
}

export const REF_CODE_RE = /^PC-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/

/** Энгийн и-мэйл шалгалт (толгойд шинэ мөр оруулахыг хаана) */
export function isValidEmail(s) {
  return typeof s === 'string' && s.length <= 254 && !/[\r\n]/.test(s) &&
    /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/.test(s)
}

/** Монголын цагаар (UTC+8) өнөөдрийн огноо YYYY-MM-DD */
export function mnToday(now = new Date()) {
  return new Date(now.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10)
}

/** ISO огноог Монголын цагаар YYYY-MM-DD болгоно */
export function mnDate(iso) {
  return iso ? mnToday(new Date(iso)) : ''
}
