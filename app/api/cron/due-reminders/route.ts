import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend } from '@/lib/resend/client'
import { addDaysToDateString, formatCurrency, formatDateShort, getTodayDateString } from '@/lib/utils'

type DueOrder = {
  id: string
  concept: string
  total_amount: number
  paid_amount: number
  due_date: string
  status: string
  clients: {
    name: string
    company: string | null
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const adminEmail = process.env.ADMIN_EMAIL_NOTIFICACIONES || process.env.ADMIN_EMAIL
  if (!adminEmail) {
    return NextResponse.json({ ok: false, error: 'missing_admin_email' }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '')
  const from = process.env.RESEND_FROM_EMAIL
  if (!appUrl || !from) {
    return NextResponse.json({ ok: false, error: 'missing_email_config' }, { status: 500 })
  }

  const tomorrow = addDaysToDateString(getTodayDateString(), 1)
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('orders')
    .select('id, concept, total_amount, paid_amount, due_date, status, clients(name, company)')
    .eq('due_date', tomorrow)
    .not('status', 'in', '("completed","cancelled")')
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const orders = ((data ?? []) as unknown as DueOrder[])
  if (!orders.length) {
    return NextResponse.json({ ok: true, sent: false, dueDate: tomorrow, count: 0 })
  }

  const ordersUrl = `${appUrl}/admin/orders?status=due_soon`
  const totalPending = orders.reduce((sum, order) => sum + Math.max(0, order.total_amount - order.paid_amount), 0)

  await resend.emails.send({
    from,
    to: adminEmail,
    subject: `OTLA · ${orders.length} orden${orders.length !== 1 ? 'es' : ''} por vencer mañana`,
    html: buildDueReminderHtml({
      orders,
      appUrl,
      ordersUrl,
      dueDate: tomorrow,
      totalPending,
    }),
  })

  return NextResponse.json({ ok: true, sent: true, dueDate: tomorrow, count: orders.length })
}

function buildDueReminderHtml({
  orders,
  appUrl,
  ordersUrl,
  dueDate,
  totalPending,
}: {
  orders: DueOrder[]
  appUrl: string
  ordersUrl: string
  dueDate: string
  totalPending: number
}) {
  const rows = orders.map((order) => {
    const pending = Math.max(0, order.total_amount - order.paid_amount)
    const orderUrl = `${appUrl}/admin/orders/${order.id}`
    const clientName = order.clients.company
      ? `${order.clients.name} · ${order.clients.company}`
      : order.clients.name

    return `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #E6EAF0;">
          <p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#1A1F36;">${escapeHtml(order.concept)}</p>
          <p style="margin:0;font-size:13px;color:#6B7280;">${escapeHtml(clientName)}</p>
        </td>
        <td style="padding:14px 0;border-bottom:1px solid #E6EAF0;text-align:right;">
          <p style="margin:0 0 6px;font-family:monospace;font-size:14px;color:#F4B740;">${formatCurrency(pending)}</p>
          <a href="${orderUrl}" style="font-size:13px;color:#4A8BFF;text-decoration:none;font-weight:700;">Ver orden</a>
        </td>
      </tr>
    `
  }).join('')

  return `
    <!doctype html>
    <html>
      <body style="margin:0;background:#F5F7FB;font-family:Arial,sans-serif;color:#1A1F36;">
        <div style="max-width:680px;margin:0 auto;padding:28px 16px;">
          <div style="background:linear-gradient(135deg,#6C5CE7 0%,#4A8BFF 100%);border-radius:22px 22px 0 0;padding:28px;text-align:center;">
            <img src="${appUrl}/otla-white.png" width="132" alt="OTLA" style="display:inline-block;max-width:132px;height:auto;" />
          </div>
          <div style="background:#FFFFFF;border:1px solid #E6EAF0;border-top:0;border-radius:0 0 22px 22px;padding:28px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#6B7280;">Vencen mañana</p>
            <h1 style="margin:0 0 10px;font-size:26px;line-height:1.2;color:#1A1F36;">${orders.length} orden${orders.length !== 1 ? 'es' : ''} por vencer</h1>
            <p style="margin:0 0 22px;font-size:15px;color:#6B7280;">
              Fecha límite: <strong>${formatDateShort(dueDate)}</strong>. Pendiente total: <strong>${formatCurrency(totalPending)}</strong>.
            </p>
            <a href="${ordersUrl}" style="display:inline-block;margin-bottom:24px;border-radius:12px;background:#4A8BFF;color:#FFFFFF;padding:12px 18px;text-decoration:none;font-weight:700;">
              Ver todas las órdenes por vencer
            </a>
            <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
              ${rows}
            </table>
            <p style="margin:24px 0 0;font-size:12px;color:#8A94A6;">OTLA · Control de pagos</p>
          </div>
        </div>
      </body>
    </html>
  `
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
