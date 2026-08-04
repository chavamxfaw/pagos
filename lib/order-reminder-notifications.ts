import { PaymentReminderEmail } from '@/emails/PaymentReminderEmail'
import { logActivity } from '@/lib/activity'
import { resend } from '@/lib/resend/client'
import { formatCurrency } from '@/lib/utils'
import { sendWhatsAppMessage, sendWhatsAppTemplate } from '@/lib/whatsapp/client'
import type { Client, Order } from '@/types'

type AdminClient = ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>

type OrderWithClient = Order & {
  clients: Client
}

export async function sendOrderReminderNotification({
  admin,
  order,
  senderName,
  source = 'manual',
}: {
  admin: AdminClient
  order: OrderWithClient
  senderName: string
  source?: 'manual' | 'automatic'
}) {
  const remaining = Math.max(0, order.total_amount - order.paid_amount)
  const url = `${process.env.NEXT_PUBLIC_APP_URL}/p/${order.token}`
  const message = [
    `Hola ${order.clients.name}, te compartimos el estado de tu orden: ${order.concept}.`,
    `Total: ${formatCurrency(order.total_amount)}. Pagado: ${formatCurrency(order.paid_amount)}. Pendiente: ${formatCurrency(remaining)}.`,
    order.due_date ? `Fecha límite: ${order.due_date}.` : '',
    `Puedes revisar el detalle aquí: ${url}`,
    `De parte de: ${senderName}`,
  ].filter(Boolean).join('\n')

  const channels: string[] = []
  const emailEnabled = order.notify_email_enabled ?? true
  const whatsAppEnabled = order.notify_whatsapp_enabled ?? true

  if (emailEnabled && order.clients.email) {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL!,
      to: order.clients.email,
      subject: `Recordatorio de pago — ${order.concept}`,
      react: PaymentReminderEmail({
        clientName: order.clients.name,
        concept: order.concept,
        paidAmount: order.paid_amount,
        totalAmount: order.total_amount,
        dueDate: order.due_date,
        token: order.token,
        appUrl: process.env.NEXT_PUBLIC_APP_URL!,
        senderName,
      }),
      text: message,
    })
    channels.push('correo')
  }

  if (whatsAppEnabled && order.clients.phone) {
    const contentSid = process.env.TWILIO_PAYMENT_REMINDER_CONTENT_SID
    if (contentSid) {
      await sendWhatsAppTemplate({
        to: order.clients.phone,
        contentSid,
        variables: {
          '1': order.clients.name,
          '2': order.concept,
          '3': formatCurrency(order.total_amount),
          '4': formatCurrency(order.paid_amount),
          '5': formatCurrency(remaining),
          '6': order.token,
          '7': senderName,
        },
      })
    } else {
      await sendWhatsAppMessage({ to: order.clients.phone, body: message })
    }
    channels.push('whatsapp')
  }

  if (!channels.length) {
    throw new Error('No hay canales disponibles para esta orden. Revisa correo, teléfono y configuración de notificaciones.')
  }

  await logActivity(admin, {
    entity_type: 'order',
    entity_id: order.id,
    client_id: order.client_id,
    order_id: order.id,
    event_type: source === 'automatic' ? 'payment_reminder_auto_sent' : 'reminder_sent',
    message: `Recordatorio ${source === 'automatic' ? 'automático ' : ''}enviado por ${channels.join(' y ')} para ${order.concept}`,
    metadata: { channels, remaining, source },
  })

  return { channels }
}
