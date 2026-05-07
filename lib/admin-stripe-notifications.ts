import 'server-only'

import { AdminStripePaymentEmail } from '@/emails/AdminStripePaymentEmail'
import { resend } from '@/lib/resend/client'
import { sendWhatsAppMessage, sendWhatsAppTemplate } from '@/lib/whatsapp/client'
import { formatCurrency } from '@/lib/utils'
import type { Client, Order, Payment, StripeCheckoutSession, UserSettings } from '@/types'

type AdminClient = ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>

type OrderWithClient = Order & {
  clients: Client
}

type NotifyAdminStripePaymentInput = {
  admin: AdminClient
  order: OrderWithClient
  payment: Payment
  checkout: StripeCheckoutSession
}

type AdminTarget = {
  email: string | null
  settings: UserSettings
}

export async function notifyAdminStripePayment({
  admin,
  order,
  payment,
  checkout,
}: NotifyAdminStripePaymentInput) {
  const targets = await getAdminTargets(admin)
  if (!targets.length) return

  await Promise.allSettled(
    targets.map(async (target) => {
      await Promise.allSettled([
        target.settings.notify_stripe_email && target.email
          ? sendAdminEmail({ targetEmail: target.email, order, payment, checkout })
          : Promise.resolve(),
        target.settings.notify_stripe_whatsapp && target.settings.admin_phone
          ? sendAdminWhatsApp({ phone: target.settings.admin_phone, order, payment, checkout })
          : Promise.resolve(),
      ])
    })
  )
}

async function getAdminTargets(admin: AdminClient): Promise<AdminTarget[]> {
  const { data: admins } = await admin
    .from('app_admin_users')
    .select('user_id')

  if (!admins?.length) return []

  const { data: settingsRows } = await admin
    .from('user_settings')
    .select('*')
    .in('user_id', admins.map((row) => row.user_id))

  const settingsByUser = new Map((settingsRows ?? []).map((settings) => [settings.user_id, settings as UserSettings]))

  const targets = await Promise.all(admins.map(async (row) => {
    const { data } = await admin.auth.admin.getUserById(row.user_id)
    const settings = settingsByUser.get(row.user_id) ?? {
      user_id: row.user_id,
      display_name: null,
      admin_phone: null,
      notify_stripe_email: true,
      notify_stripe_whatsapp: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    return {
      email: data.user?.email ?? null,
      settings,
    }
  }))

  return targets.filter((target) => target.email || target.settings.admin_phone)
}

async function sendAdminEmail({
  targetEmail,
  order,
  payment,
  checkout,
}: {
  targetEmail: string
  order: OrderWithClient
  payment: Payment
  checkout: StripeCheckoutSession
}) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: targetEmail,
    subject: `Pago Stripe recibido — ${order.concept}`,
    react: AdminStripePaymentEmail({
      clientName: order.clients.name,
      concept: order.concept,
      amount: payment.amount,
      totalCharged: checkout.total_charged,
      feeAmount: checkout.fee_amount,
      orderId: order.id,
      appUrl: process.env.NEXT_PUBLIC_APP_URL!,
    }),
  })
}

async function sendAdminWhatsApp({
  phone,
  order,
  payment,
  checkout,
}: {
  phone: string
  order: OrderWithClient
  payment: Payment
  checkout: StripeCheckoutSession
}) {
  const contentSid = process.env.TWILIO_ADMIN_STRIPE_PAYMENT_CONTENT_SID
  const orderUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/orders/${order.id}`

  if (contentSid) {
    await sendWhatsAppTemplate({
      to: phone,
      contentSid,
      variables: {
        '1': order.clients.name,
        '2': order.concept,
        '3': formatCurrency(payment.amount),
        '4': formatCurrency(checkout.total_charged),
        '5': formatCurrency(checkout.fee_amount),
        '6': order.id,
      },
    })
    return
  }

  await sendWhatsAppMessage({
    to: phone,
    body: [
      `Pago Stripe recibido: ${formatCurrency(payment.amount)}`,
      `Cliente: ${order.clients.name}`,
      `Orden: ${order.concept}`,
      `Cargo total: ${formatCurrency(checkout.total_charged)}. Comisión: ${formatCurrency(checkout.fee_amount)}.`,
      `Ver orden: ${orderUrl}`,
    ].join('\n'),
  })
}
