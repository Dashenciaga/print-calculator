import { NextResponse } from 'next/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request) {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Хандах эрхгүй' }, { status: 403 })
    }

    const { target_user_id, action } = await request.json()
    if (!target_user_id || !['grant', 'revoke'].includes(action)) {
      return NextResponse.json({ error: 'Буруу параметр' }, { status: 400 })
    }

    const admin = adminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    if (action === 'grant') {
      const expiresAt = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      await admin.from('subscriptions').upsert({
        user_id:    target_user_id,
        plan:       'pro',
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    } else {
      await admin.from('subscriptions').upsert({
        user_id:    target_user_id,
        plan:       'free',
        expires_at: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
