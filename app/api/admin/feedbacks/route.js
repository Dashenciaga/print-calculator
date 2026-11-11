import { adminDb, getUser, isAdmin, json, fail, serverError, readJson } from '@/lib/server/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getUser()
    if (!isAdmin(user)) return fail(403, 'Хандах эрхгүй')

    const { data: feedbacks, error } = await adminDb()
      .from('feedbacks').select('*')
      .order('created_at', { ascending: false }).limit(100)
    if (error) throw error

    return json({ feedbacks: feedbacks || [] })
  } catch (e) {
    return serverError('admin/feedbacks GET', e)
  }
}

export async function PATCH(request) {
  try {
    const user = await getUser()
    if (!isAdmin(user)) return fail(403, 'Хандах эрхгүй')

    const body = await readJson(request)
    if (body?.id == null) return fail(400, 'Буруу хүсэлт')

    const { error } = await adminDb().from('feedbacks').update({ is_read: true }).eq('id', body.id)
    if (error) throw error
    return json({ ok: true })
  } catch (e) {
    return serverError('admin/feedbacks PATCH', e)
  }
}
