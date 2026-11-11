import { adminDb, getUser, getSubscription, json, fail, serverError, isMissingTable, isAdmin } from '@/lib/server/auth'
import { PRO_PRICE, PRO_MONTHS } from '@/lib/billing'

export const dynamic = 'force-dynamic'

// Нэвтэрсэн хэрэглэгчийн эрх, хүлээгдэж буй төлбөр, шилжүүлэх дансны мэдээлэл
export async function GET() {
  try {
    const user = await getUser()
    if (!user) return fail(401, 'Нэвтрээгүй байна')

    const db = adminDb()
    const { sub, pro: paid } = await getSubscription(db, user.id)
    const pro = paid || isAdmin(user) // админ үргэлж бүх боломжийг ашиглана

    const { data: requests, error } = await db
      .from('payment_requests')
      .select('id, ref_code, amount, months, status, note, created_at, reviewed_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
    if (error && !isMissingTable(error)) throw error

    const last = requests?.[0] || null
    const bank = {
      name:    process.env.PAY_BANK_NAME || '',
      account: process.env.PAY_ACCOUNT_NUMBER || '',
      holder:  process.env.PAY_ACCOUNT_NAME || '',
    }

    return json({
      pro,
      admin:      isAdmin(user),
      expires_at: pro ? sub?.expires_at || null : null,
      pending:    last?.status === 'pending' ? last : null,
      last,
      price:      PRO_PRICE,
      months:     PRO_MONTHS,
      bank,
      ready:      !error && !!(bank.name && bank.account && bank.holder),
    })
  } catch (e) {
    return serverError('billing/status', e)
  }
}
