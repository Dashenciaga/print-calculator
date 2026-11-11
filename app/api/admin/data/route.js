import { adminDb, getUser, isAdmin, json, fail, serverError } from '@/lib/server/auth'
import { isProActive, mnToday, mnDate } from '@/lib/billing'

export const dynamic = 'force-dynamic'

// Бүх хэрэглэгчийг хуудаслаж авна (1000-аас олон байсан ч таслагдахгүй)
async function listAllUsers(db) {
  const all = []
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    all.push(...data.users)
    if (data.users.length < 1000) break
  }
  return all
}

export async function GET() {
  try {
    const user = await getUser()
    if (!isAdmin(user)) return fail(403, 'Хандах эрхгүй')

    const db = adminDb()
    const [users, { data: profiles }, { data: subscriptions }, { data: calculations }, payRes] = await Promise.all([
      listAllUsers(db),
      db.from('profiles').select('*'),
      db.from('subscriptions').select('user_id, plan, expires_at'),
      db.from('calculations').select('user_id, name, paper_size, qty, total, created_at').order('created_at', { ascending: false }),
      db.from('payment_requests').select('amount, status'),
    ])
    const payments = payRes.error ? [] : payRes.data || []

    const profileOf = id => profiles?.find(p => p.user_id === id) || null
    const subOf     = id => subscriptions?.find(s => s.user_id === id) || null

    const combined = users.map(u => {
      const sub = subOf(u.id)
      return {
        id:           u.id,
        email:        u.email,
        created_at:   u.created_at,
        profile:      profileOf(u.id),
        subscription: sub,
        pro:          isProActive(sub),
        calc_count:   calculations?.filter(c => c.user_id === u.id).length || 0,
      }
    })

    const today = mnToday()
    return json({
      users: combined,
      stats: {
        total_users: users.length,
        pro_users:   combined.filter(u => u.pro).length,
        total_calcs: calculations?.length || 0,
        today_calcs: calculations?.filter(c => mnDate(c.created_at) === today).length || 0,
        // Орлого = зөвхөн админ баталсан бодит төлбөр
        revenue:     payments.filter(p => p.status === 'approved').reduce((s, p) => s + (p.amount || 0), 0),
        pending_payments: payments.filter(p => p.status === 'pending').length,
      },
      recent_calcs: (calculations || []).slice(0, 20).map(c => ({
        ...c,
        email:   users.find(u => u.id === c.user_id)?.email || '—',
        company: profileOf(c.user_id)?.company_name || '—',
      })),
    })
  } catch (e) {
    return serverError('admin/data', e)
  }
}
