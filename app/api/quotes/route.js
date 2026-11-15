import { adminDb, getUser, getSubscription, isAdmin, json, fail, serverError, readJson, isMissingTable } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'

const DAILY_LIMIT = 200

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '') || null
const num = (v, min, max) => (Number.isFinite(v) && v >= min && v <= max ? v : null)

// Үнийн санал үүсгэж давхцахгүй дугаар олгоно — зөвхөн Pro хэрэглэгч
export async function POST(request) {
  try {
    const user = await getUser()
    if (!user) return fail(401, 'Нэвтрээгүй байна')

    const db = adminDb()
    const { pro } = await getSubscription(db, user.id)
    if (!pro && !isAdmin(user)) return fail(402, 'Үнийн санал гаргах нь Pro эрхтэй хэрэглэгчид нээлттэй.')

    const body = await readJson(request)
    if (!body) return fail(400, 'Буруу хүсэлт')

    const qty   = num(body.qty, 1, 100_000_000)
    const total = num(body.total, 0, 1e13)
    const vat   = num(body.vat_total, 0, 1e13)
    if (qty == null || total == null || vat == null) return fail(400, 'Тоон утга буруу байна')

    const data = body.data && typeof body.data === 'object' ? body.data : null
    if (data && JSON.stringify(data).length > 20_000) return fail(413, 'Өгөгдөл хэт том байна')

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const { count, error: cErr } = await db.from('quotes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).gte('created_at', since)
    if (cErr) {
      if (isMissingTable(cErr)) return fail(503, 'Өгөгдлийн сангийн тохиргоо дутуу байна (SQL migration).')
      throw cErr
    }
    if ((count || 0) >= DAILY_LIMIT) return fail(429, 'Өнөөдрийн үнийн саналын хязгаарт хүрлээ.')

    const { data: quote, error } = await db.from('quotes').insert({
      user_id:        user.id,
      client_name:    str(body.client_name, 200),
      client_contact: str(body.client_contact, 200),
      product:        str(body.product, 200),
      qty:            Math.round(qty),
      total:          Math.round(total),
      vat_total:      Math.round(vat),
      data,
    }).select('id, number, created_at').single()
    if (error) throw error

    return json({ quote }, 201)
  } catch (e) {
    return serverError('quotes POST', e)
  }
}
