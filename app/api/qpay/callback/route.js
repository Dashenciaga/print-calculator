import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const body = await request.json()
    const invoiceId = body.invoice_id || body.qpay_payment_request_id
    if (!invoiceId) return NextResponse.json({ status: 'ok' })

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)

    await supabase
      .from('subscriptions')
      .update({
        plan:       'pro',
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('qpay_invoice_id', invoiceId)
      .eq('plan', 'pending')

    return NextResponse.json({ status: 'ok' })
  } catch {
    return NextResponse.json({ status: 'ok' })
  }
}
