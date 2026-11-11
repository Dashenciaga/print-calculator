import { adminDb, getUser, isAdmin, json, fail, serverError, readJson, isMissingTable } from '@/lib/server/auth'
import { extendExpiry, isProActive } from '@/lib/billing'

export const dynamic = 'force-dynamic'

// Төлбөрийн хүсэлтийн жагсаалт (хүлээгдэж буй нь эхэндээ)
export async function GET() {
  try {
    const user = await getUser()
    if (!isAdmin(user)) return fail(403, 'Хандах эрхгүй')

    const db = adminDb()
    const { data: rows, error } = await db.from('payment_requests')
      .select('*').order('created_at', { ascending: false }).limit(300)
    if (error) {
      if (isMissingTable(error)) return json({ payments: [], setupMissing: true })
      throw error
    }

    const ids = [...new Set(rows.map(r => r.user_id))]
    const { data: profiles } = ids.length
      ? await db.from('profiles').select('user_id, company_name, phone').in('user_id', ids)
      : { data: [] }

    const payments = rows
      .map(r => ({ ...r, company: profiles?.find(p => p.user_id === r.user_id)?.company_name || null,
        phone: profiles?.find(p => p.user_id === r.user_id)?.phone || null }))
      .sort((a, b) => (a.status === 'pending') === (b.status === 'pending') ? 0 : a.status === 'pending' ? -1 : 1)

    return json({ payments })
  } catch (e) {
    return serverError('admin/payments GET', e)
  }
}

// Батлах / татгалзах
export async function POST(request) {
  try {
    const user = await getUser()
    if (!isAdmin(user)) return fail(403, 'Хандах эрхгүй')

    const body = await readJson(request)
    const id = typeof body?.id === 'string' ? body.id : ''
    const action = body?.action
    const note = typeof body?.note === 'string' ? body.note.slice(0, 500) : null
    if (!/^[0-9a-f-]{36}$/i.test(id) || !['approve', 'reject'].includes(action)) {
      return fail(400, 'Буруу хүсэлт')
    }

    const db = adminDb()
    const reviewed = { reviewed_at: new Date().toISOString(), reviewed_by: user.email, note }

    if (action === 'reject') {
      const { data, error } = await db.from('payment_requests')
        .update({ status: 'rejected', ...reviewed })
        .eq('id', id).eq('status', 'pending').select('id').maybeSingle()
      if (error) throw error
      if (!data) return fail(409, 'Хүсэлт аль хэдийн шийдэгдсэн байна')
      return json({ ok: true })
    }

    // 1) Эхлээд статусыг "approved" болгоно — зөвхөн pending үед. Хоёр удаа батлагдахаас сэргийлнэ.
    const { data: req, error: upErr } = await db.from('payment_requests')
      .update({ status: 'approved', ...reviewed })
      .eq('id', id).eq('status', 'pending')
      .select('id, user_id, months').maybeSingle()
    if (upErr) throw upErr
    if (!req) return fail(409, 'Хүсэлт аль хэдийн шийдэгдсэн байна')

    // 2) Эрх сунгана: идэвхтэй эрх байвал түүн дээр нэмнэ
    const { data: sub } = await db.from('subscriptions')
      .select('plan, expires_at').eq('user_id', req.user_id).maybeSingle()
    const expires = extendExpiry(isProActive(sub) ? sub.expires_at : null, req.months)

    const { error: subErr } = await db.from('subscriptions').upsert({
      user_id:    req.user_id,
      plan:       'pro',
      expires_at: expires.toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (subErr) {
      // Эрх өгч чадаагүй бол хүсэлтийг буцааж pending болгоно
      await db.from('payment_requests')
        .update({ status: 'pending', reviewed_at: null, reviewed_by: null }).eq('id', req.id)
      throw subErr
    }

    return json({ ok: true, expires_at: expires.toISOString() })
  } catch (e) {
    return serverError('admin/payments POST', e)
  }
}
