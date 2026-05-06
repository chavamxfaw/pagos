"use server"

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/admin'
import { resend } from '@/lib/resend/client'
import { PaymentReminderEmail } from '@/emails/PaymentReminderEmail'
import { sendWhatsAppMessage, sendWhatsAppTemplate } from '@/lib/whatsapp/client'
import { logActivity } from '@/lib/activity'
import { formatCurrency } from '@/lib/utils'
import { getDisplayName } from '@/actions/user-settings'

async function requireAuth() {
  return requireAdmin()
}

export async function sendOrderReminder(orderId: string) {
  const user = await requireAuth()
  const admin = createAdminClient()

  const senderName = await getDisplayName(user.id, user.email!)

  const { data: order, error } = await admin
    .from('orders')
    .select('*, clients(*)')
    .eq('id', orderId)
    .single()

  if (error || !order) throw new Error(error?.message ?? 'Orden no encontrada')

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

  if (order.clients.email) {
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

  if (order.clients.phone) {
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
    throw new Error('El cliente no tiene correo ni teléfono registrado.')
  }

  await logActivity(admin, {
    entity_type: 'order',
    entity_id: orderId,
    client_id: order.client_id,
    order_id: orderId,
    event_type: 'reminder_sent',
    message: `Recordatorio enviado por ${channels.join(' y ')} para ${order.concept}`,
    metadata: { channels, remaining },
  })

  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath(`/admin/clients/${order.client_id}`)
}
