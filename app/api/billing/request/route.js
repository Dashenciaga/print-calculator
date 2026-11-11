import { adminDb, getUser, json, fail, serverError, isMissingTable } from '@/lib/server/auth'
import { PRO_PRICE, PRO_MONTHS, makeRefCode } from '@/lib/billing'

export const dynamic = 'force-dynamic'

const DAILY_LIMIT = 5 // нэг хэрэглэгч өдөрт үүсгэх хүсэлтийн дээд тоо

// Төлбөрийн хүсэлт үүсгэнэ → гүйлгээний утгад бичих код буцаана.
// Pro эрхийг ЭНД ӨГӨХГҮЙ — зөвхөн админ орлогыг шалгаад батална.
export async function POST() {
  try {
    const user = await getUser()
    if (!user) return fail(401, 'Нэвтрээгүй байна')
    if (!user.email_confirmed_at) return fail(403, 'И-мэйлээ баталгаажуулсны дараа төлбөр хийнэ үү.')

    if (!process.env.PAY_BANK_NAME || !process.env.PAY_ACCOUNT_NUMBER || !process.env.PAY_ACCOUNT_NAME) {
      return fail(503, 'Төлбөр хүлээн авах данс тохируулагдаагүй байна. Админд хандана уу.')
    }

    const db = adminDb()

    // Хүлээгдэж буй хүсэлт байвал шинээр үүсгэхгүй, түүнийг буцаана
    const { data: pending, error: pErr } = await db
      .from('payment_requests')
      .select('id, ref_code, amount, months, status, created_at')
      .eq('user_id', user.id).eq('status', 'pending').maybeSingle()
    if (pErr) {
      if (isMissingTable(pErr)) return fail(503, 'Өгөгдлийн сангийн тохиргоо дутуу байна (SQL migration).')
      throw pErr
    }
    if (pending) return json({ request: pending })

    // Spam-аас хамгаална
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const { count } = await db.from('payment_requests')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).gte('created_at', since)
    if ((count || 0) >= DAILY_LIMIT) return fail(429, 'Өнөөдөр хэт олон хүсэлт үүсгэлээ. Маргааш дахин оролдоно уу.')

    // Давхцахгүй код (ховор давхцалд дахин оролдоно)
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data, error } = await db.from('payment_requests').insert({
        user_id:  user.id,
        email:    user.email,
        ref_code: makeRefCode(),
        amount:   PRO_PRICE,
        months:   PRO_MONTHS,
      }).select('id, ref_code, amount, months, status, created_at').single()

      if (!error) return json({ request: data }, 201)
      if (error.code !== '23505') throw error
      // 23505: ref_code давхацсан эсвэл зэрэг дарагдаж pending аль хэдийн үүссэн
      const { data: again } = await db.from('payment_requests')
        .select('id, ref_code, amount, months, status, created_at')
        .eq('user_id', user.id).eq('status', 'pending').maybeSingle()
      if (again) return json({ request: again })
    }
    return fail(500, 'Код үүсгэж чадсангүй. Дахин оролдоно уу.')
  } catch (e) {
    return serverError('billing/request', e)
  }
}
