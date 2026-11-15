import nodemailer from 'nodemailer'
import { adminDb, getUser, getSubscription, isAdmin, json, fail, serverError, readJson } from '@/lib/server/auth'
import { isValidEmail } from '@/lib/billing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DAILY_LIMIT = 30                 // нэг хэрэглэгч өдөрт илгээх и-мэйл
const MAX_PDF_BYTES = 3 * 1024 * 1024  // 3MB (Vercel-ийн хүсэлтийн хязгаараас бага)

const oneLine = s => String(s || '').replace(/[\r\n"<>]+/g, ' ').trim().slice(0, 120)
const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

function transport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
  const port = Number(SMTP_PORT || 465)
  return nodemailer.createTransport({
    host: SMTP_HOST, port, secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

// Үнийн саналын PDF-ийг үйлчлүүлэгч рүү и-мэйлээр илгээнэ — зөвхөн Pro, зөвхөн өөрийн санал
export async function POST(request, { params }) {
  try {
    const user = await getUser()
    if (!user) return fail(401, 'Нэвтрээгүй байна')

    const { id } = await params
    if (!/^[0-9a-f-]{36}$/i.test(id || '')) return fail(400, 'Буруу хүсэлт')

    const mailer = transport()
    if (!mailer) return fail(503, 'И-мэйл илгээх тохиргоо хийгдээгүй байна. Админд хандана уу.')

    const db = adminDb()
    const { pro } = await getSubscription(db, user.id)
    if (!pro && !isAdmin(user)) return fail(402, 'И-мэйлээр илгээх нь Pro эрхтэй хэрэглэгчид нээлттэй.')

    const { data: quote } = await db.from('quotes')
      .select('id, number, user_id, product, qty, vat_total')
      .eq('id', id).eq('user_id', user.id).maybeSingle()
    if (!quote) return fail(404, 'Үнийн санал олдсонгүй')

    const body = await readJson(request)
    const to = typeof body?.to === 'string' ? body.to.trim() : ''
    if (!isValidEmail(to)) return fail(400, 'И-мэйл хаяг буруу байна')
    const message = typeof body?.message === 'string' ? body.message.slice(0, 2000) : ''

    const b64 = typeof body?.pdf === 'string' ? body.pdf.replace(/^data:application\/pdf;base64,/, '') : ''
    const pdf = Buffer.from(b64, 'base64')
    if (pdf.length < 100 || pdf.length > MAX_PDF_BYTES) return fail(413, 'PDF файлын хэмжээ буруу байна')
    if (pdf.subarray(0, 5).toString() !== '%PDF-') return fail(400, 'PDF файл биш байна')

    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
    const { count } = await db.from('quote_emails')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).gte('created_at', since)
    if ((count || 0) >= DAILY_LIMIT) return fail(429, 'Өнөөдрийн и-мэйлийн хязгаарт хүрлээ.')

    const { data: profile } = await db.from('profiles')
      .select('company_name, contact_email, phone').eq('user_id', user.id).maybeSingle()
    const company = oneLine(profile?.company_name) || 'PrintCalc'
    const replyTo = isValidEmail(profile?.contact_email) ? profile.contact_email : user.email
    const from = process.env.MAIL_FROM || process.env.SMTP_USER

    const vat = Number(quote.vat_total || 0).toLocaleString('en-US')
    const intro = message.trim()
      ? esc(message).replace(/\n/g, '<br>')
      : `Сайн байна уу,<br><br>Таны хүсэлтийн дагуу <b>${esc(quote.product || 'хэвлэлийн')}</b> үнийн саналыг хавсралтаар илгээж байна.`

    await mailer.sendMail({
      from:    { name: `${company} (PrintCalc)`, address: from },
      to,
      replyTo,
      subject: `Үнийн санал ${quote.number} — ${company}`,
      text:    `${message || 'Үнийн саналыг хавсралтаар илгээлээ.'}\n\n${company}${profile?.phone ? '\n' + profile.phone : ''}\n${replyTo}`,
      html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#1a1f36;line-height:1.6">
        <p>${intro}</p>
        <p style="margin:16px 0;padding:12px 14px;background:#f4f6fb;border-radius:8px">
          Дугаар: <b>${esc(quote.number)}</b><br>
          Тоо ширхэг: <b>${Number(quote.qty || 0).toLocaleString('en-US')}</b><br>
          Нийт дүн (НӨАТ орсон): <b>₮${vat}</b>
        </p>
        <p>Хүндэтгэсэн,<br><b>${esc(company)}</b>${profile?.phone ? '<br>' + esc(profile.phone) : ''}<br>${esc(replyTo)}</p>
      </div>`,
      attachments: [{ filename: `${quote.number}.pdf`, content: pdf, contentType: 'application/pdf' }],
    })

    const sentAt = new Date().toISOString()
    await db.from('quote_emails').insert({ quote_id: quote.id, user_id: user.id, to_email: to })
    await db.from('quotes').update({ sent_to: to, sent_at: sentAt }).eq('id', quote.id)

    return json({ ok: true, sent_at: sentAt })
  } catch (e) {
    return serverError('quotes/send', e)
  }
}
