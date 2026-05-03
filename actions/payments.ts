"use server"

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend/client'
import { PaymentReceiptEmail } from '@/emails/PaymentReceiptEmail'
import { sendWhatsAppMessage } from '@/lib/whatsapp/client'
import { formatCurrency, getPaymentMethodLabel } from '@/lib/utils'
import type { PaymentMethod } from '@/types'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')
  return user
}

export async function addPayment(data: {
  order_id: string
  amount: number
  concept: string
  payment_method: PaymentMethod
  payment_reference?: string
  notes?: string
}) {
  await requireAuth()
  const admin = createAdminClient()

  const { data: payment, error } = await admin
    .from('payments')
    .insert(data)
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Fetch orden actualizada + cliente (el trigger ya actualizó paid_amount y status)
  const { data: order } = await admin
    .from('orders')
    .select('*, clients(*)')
    .eq('id', data.order_id)
    .single()

  if (order?.clients) {
    // Enviar correo solo si el cliente tiene email. Si falla, no hacemos rollback.
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
            paymentDate: payment.created_at,
            paidAmount: order.paid_amount,
            totalAmount: order.total_amount,
            token: order.token,
            appUrl: process.env.NEXT_PUBLIC_APP_URL!,
          }),
        })
      } catch (emailError) {
        console.error('Error enviando correo:', emailError)
      }
    }

    if (order.clients.phone) {
      try {
        const remaining = Math.max(0, order.total_amount - order.paid_amount)
        const statusLink = `${process.env.NEXT_PUBLIC_APP_URL}/p/${order.token}`

        await sendWhatsAppMessage({
          to: order.clients.phone,
          body: [
            `Hola ${order.clients.name}, registramos tu abono de ${formatCurrency(payment.amount)} para ${order.concept}.`,
            `Método: ${getPaymentMethodLabel(payment.payment_method)}${payment.payment_reference ? ` (${payment.payment_reference})` : ''}.`,
            `Pagado: ${formatCurrency(order.paid_amount)} de ${formatCurrency(order.total_amount)}.`,
            remaining > 0 ? `Saldo pendiente: ${formatCurrency(remaining)}.` : 'Tu orden quedó liquidada.',
            `Consulta tu estado aquí: ${statusLink}`,
          ].join('\n'),
        })
      } catch (whatsAppError) {
        console.error('Error enviando WhatsApp:', whatsAppError)
      }
    }
  }

  revalidatePath(`/admin/orders/${data.order_id}`)
  revalidatePath('/admin/orders')
  revalidatePath('/admin')
  return payment
}

export async function deletePayment(paymentId: string, orderId: string) {
  await requireAuth()
  const admin = createAdminClient()

  const { error } = await admin
    .from('payments')
    .delete()
    .eq('id', paymentId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath('/admin/orders')
  revalidatePath('/admin')
}
