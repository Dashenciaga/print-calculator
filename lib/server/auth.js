// Зөвхөн серверт (API route) ашиглана. Клиент код энэ файлыг импортлох ёсгүй.
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { isProActive } from '@/lib/billing'

const URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** Service role клиент — RLS-ийг тойрно. Зөвхөн эрх шалгасны ДАРАА ашиглана. */
export function adminDb() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY тохируулаагүй')
  return createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Cookie-оос нэвтэрсэн хэрэглэгчийг серверт баталгаажуулж авна (getUser = Supabase-аас шалгана). */
export async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(URL, ANON, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: list => {
        try { list.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
      },
    },
  })
  const { data: { user } } = await supabase.auth.getUser()
  return user || null
}

/** Админы жагсаалт: ADMIN_EMAILS (серверт л харагдана), эсвэл хуучин NEXT_PUBLIC_ADMIN_EMAIL */
function adminEmails() {
  return (process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAIL || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
}

export function isAdmin(user) {
  return !!user?.email && !!user.email_confirmed_at && adminEmails().includes(user.email.toLowerCase())
}

/** Хэрэглэгчийн Pro эрхийг серверт шалгана */
export async function getSubscription(db, userId) {
  const { data } = await db.from('subscriptions').select('plan, expires_at').eq('user_id', userId).maybeSingle()
  return { sub: data || null, pro: isProActive(data) }
}

export const json = (data, status = 200) => NextResponse.json(data, { status })
export const fail = (status, error) => NextResponse.json({ error }, { status })

/** Дотоод алдааг лог-д бичээд хэрэглэгчид ерөнхий мессеж буцаана (дотоод мэдээлэл задруулахгүй) */
export function serverError(where, e) {
  console.error(`[${where}]`, e)
  return fail(500, 'Серверийн алдаа гарлаа. Дахин оролдоно уу.')
}

/** Хүснэгт үүсээгүй (SQL migration ажиллуулаагүй) эсэх */
export function isMissingTable(error) {
  return error?.code === '42P01' || error?.code === 'PGRST205' || /does not exist|schema cache/i.test(error?.message || '')
}

/** Хүсэлтийн JSON-ийг аюулгүй уншина */
export async function readJson(request) {
  try { return await request.json() } catch { return null }
}
