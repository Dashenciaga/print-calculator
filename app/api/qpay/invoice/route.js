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

export async function POST() {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { cookies: { getAll: () => cookieStore.getAll() } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Нэвтрээгүй байна' }, { status: 401 })

    const token = await qpayToken()
    const invoiceNo = `PC_${user.id.slice(0, 8)}_${Date.now()}`
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://print-calculator-chi.vercel.app'

    const r = await fetch('https://merchant.qpay.mn/v2/invoice', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        invoice_code:           process.env.QPAY_INVOICE_CODE,
        sender_invoice_no:      invoiceNo,
        invoice_receiver_code:  'terminal',
        invoice_description:    'PrintCalc Pro — жилийн эрх',
        amount:                 199000,
        callback_url:           `${baseUrl}/api/qpay/callback`,
      }),
    })

    const invoice = await r.json()
    if (!invoice.invoice_id) {
      return NextResponse.json({ error: 'Нэхэмжлэл үүсгэж чадсангүй', detail: invoice }, { status: 502 })
    }

    await supabase.from('subscriptions').upsert({
      user_id:          user.id,
      plan:             'pending',
      qpay_invoice_id:  invoice.invoice_id,
      updated_at:       new Date().toISOString(),
    }, { onConflict: 'user_id' })

    return NextResponse.json({
      invoice_id: invoice.invoice_id,
      qr_image:   invoice.qr_image,
      qr_text:    invoice.qr_text,
      urls:       invoice.urls || [],
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
