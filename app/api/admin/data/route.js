import { NextResponse } from 'next/server'
import { createClient as adminClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function getAdmin() {
  return adminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

async function getRequestUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  try {
    const user = await getRequestUser()
    if (!user || user.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
      return NextResponse.json({ error: 'Хандах эрхгүй' }, { status: 403 })
    }

    const admin = await getAdmin()

    const [
      { data: { users } },
      { data: profiles },
      { data: subscriptions },
      { data: calculations },
    ] = await Promise.all([
      admin.auth.admin.listUsers({ perPage: 1000 }),
      admin.from('profiles').select('*'),
      admin.from('subscriptions').select('*'),
      admin.from('calculations').select('user_id, name, paper_size, qty, total, created_at').order('created_at', { ascending: false }),
    ])

    const combined = users.map(u => ({
      id:           u.id,
      email:        u.email,
      created_at:   u.created_at,
      profile:      profiles?.find(p => p.user_id === u.id) || null,
      subscription: subscriptions?.find(s => s.user_id === u.id) || null,
      calc_count:   calculations?.filter(c => c.user_id === u.id).length || 0,
    }))

    const today = new Date().toISOString().slice(0, 10)
    const proSubs = subscriptions?.filter(s => s.plan === 'pro') || []
    const revenue = proSubs.length * 199000

    return NextResponse.json({
      users: combined,
      stats: {
        total_users:   users.length,
        pro_users:     proSubs.length,
        total_calcs:   calculations?.length || 0,
        today_calcs:   calculations?.filter(c => c.created_at?.startsWith(today)).length || 0,
        revenue,
      },
      recent_calcs: calculations?.slice(0, 20).map(c => ({
        ...c,
        email: users.find(u => u.id === c.user_id)?.email || '—',
        company: profiles?.find(p => p.user_id === c.user_id)?.company_name || '—',
      })) || [],
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
