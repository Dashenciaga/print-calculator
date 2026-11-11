import { adminDb, getUser, isAdmin, json, fail, serverError, readJson } from '@/lib/server/auth'
import { extendExpiry, isProActive, PRO_MONTHS } from '@/lib/billing'

export const dynamic = 'force-dynamic'

// Админ гараар Pro эрх өгөх / хасах (төлбөрийн хүсэлтгүйгээр)
export async function POST(request) {
  try {
    const user = await getUser()
    if (!isAdmin(user)) return fail(403, 'Хандах эрхгүй')

    const body = await readJson(request)
    const target = typeof body?.target_user_id === 'string' ? body.target_user_id : ''
    const action = body?.action
    if (!/^[0-9a-f-]{36}$/i.test(target) || !['grant', 'revoke'].includes(action)) {
      return fail(400, 'Буруу параметр')
    }

    const db = adminDb()
    let row
    if (action === 'grant') {
      const { data: sub } = await db.from('subscriptions').select('plan, expires_at').eq('user_id', target).maybeSingle()
      const expires = extendExpiry(isProActive(sub) ? sub.expires_at : null, PRO_MONTHS)
      row = { user_id: target, plan: 'pro', expires_at: expires.toISOString() }
    } else {
      row = { user_id: target, plan: 'free', expires_at: null }
    }

    const { error } = await db.from('subscriptions')
      .upsert({ ...row, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) throw error

    return json({ ok: true, ...row })
  } catch (e) {
    return serverError('admin/grant', e)
  }
}
