import { PaymentReceiptEmail } from '@/emails/PaymentReceiptEmail'
import { resend } from '@/lib/resend/client'
import { sendWhatsAppMessage, sendWhatsAppTemplate } from '@/lib/whatsapp/client'
import { formatCurrency, getPaymentMethodLabel } from '@/lib/utils'
import type { Client, Order, Payment } from '@/types'

type AdminClient = ReturnType<typeof import('@/lib/supabase/admin').createAdminClient>

type OrderWithClient = Order & {
  clients: Client
}

type NotifyPaymentReceiptInput = {
  admin: AdminClient
  order: OrderWithClient
  payment: Payment
  senderName?: string
}

export async function notifyPaymentReceipt({
  admin,
  order,
  payment,
  senderName,
}: NotifyPaymentReceiptInput) {
  const resolvedSenderName = senderName ?? await getDefaultSenderName(admin)

  if (order.clients.email) {
    try {
      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL!,
        to: order.clients.email,
        subject: `Recibo de abono — ${order.concept}`,
        react: PaymentReceiptEmail({
          clientName: order.clients.name,
          concept: order.concept,
          paymentAmount: payment.amount,
          paymentDate: payment.paid_at ?? payment.created_at,
          paidAmount: order.paid_amount,
          totalAmount: order.total_amount,
          token: order.token,
          appUrl: process.env.NEXT_PUBLIC_APP_URL!,
          senderName: resolvedSenderName,
        }),
      })
    } catch (emailError) {
      console.error('Error enviando correo de abono:', emailError)
    }
  }

  if (order.clients.phone) {
    try {
      const remaining = Math.max(0, order.total_amount - order.paid_amount)
      const statusLink = `${process.env.NEXT_PUBLIC_APP_URL}/p/${order.token}`
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
            '7': resolvedSenderName,
          },
        })
      } else {
        await sendWhatsAppMessage({
          to: order.clients.phone,
          body: [
            `Hola ${order.clients.name}, registramos tu abono de ${formatCurrency(payment.amount)} para ${order.concept}.`,
            `Método: ${getPaymentMethodLabel(payment.payment_method)}${payment.payment_reference ? ` (${payment.payment_reference})` : ''}.`,
            `Pagado: ${formatCurrency(order.paid_amount)} de ${formatCurrency(order.total_amount)}.`,
            remaining > 0 ? `Saldo pendiente: ${formatCurrency(remaining)}.` : 'Tu orden quedó liquidada.',
            `Consulta tu estado aquí: ${statusLink}`,
            `De parte de: ${resolvedSenderName}`,
          ].join('\n'),
        })
      }
    } catch (whatsAppError) {
      console.error('Error enviando WhatsApp de abono:', whatsAppError)
    }
  }
}

async function getDefaultSenderName(admin: AdminClient) {
  const { data } = await admin
    .from('user_settings')
    .select('display_name')
    .not('display_name', 'is', null)
    .limit(1)
    .maybeSingle()

  return data?.display_name || 'OTLA'
}
