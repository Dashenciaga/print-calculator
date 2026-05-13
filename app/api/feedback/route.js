import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const { message, rating } = await request.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Санал бичнэ үү' }, { status: 400 })
    }

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )

    const { data: { user } } = await supabase.auth.getUser()

    let company_name = null
    if (user) {
      const { data: prof } = await supabase
        .from('profiles').select('company_name').eq('user_id', user.id).single()
      company_name = prof?.company_name || null
    }

    await supabase.from('feedbacks').insert({
      user_id:      user?.id || null,
      email:        user?.email || null,
      company_name,
      message:      message.trim(),
      rating:       rating || null,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
