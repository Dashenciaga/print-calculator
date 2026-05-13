import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function qpayToken() {
  const creds = Buffer.from(
    `${process.env.QPAY_USERNAME}:${process.env.QPAY_PASSWORD}`
  ).toString('base64')
  const r = await fetch('https://merchant.qpay.mn/v2/auth/token', {
    method: 'POST',
    headers: { Authorization: `Basic ${creds}` },
  })
  const d = await r.json()
  if (!d.access_token) throw new Error('QPay token авч чадсангүй')
  return d.access_token
}

export async function POST(request) {
  try {
    const { invoice_id } = await request.json()
    if (!invoice_id) return NextResponse.json({ error: 'invoice_id байхгүй' }, { status: 400 })

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Нэвтрээгүй байна' }, { status: 401 })

    const token = await qpayToken()
    const r = await fetch('https://merchant.qpay.mn/v2/payment/check', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        object_type: 'INVOICE',
        object_id:   invoice_id,
        offset:      { page_number: 1, page_limit: 100 },
      }),
    })

    const result = await r.json()
    const paid = result.count > 0 && result.rows?.some(row => row.payment_status === 'PAID')

    if (paid) {
      const expiresAt = new Date()
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      await supabase.from('subscriptions').upsert({
        user_id:          user.id,
        plan:             'pro',
        expires_at:       expiresAt.toISOString(),
        qpay_invoice_id:  invoice_id,
        updated_at:       new Date().toISOString(),
      }, { onConflict: 'user_id' })
    }

    return NextResponse.json({ paid })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
