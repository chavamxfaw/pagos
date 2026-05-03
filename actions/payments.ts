"use server"

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend/client'
import { PaymentReceiptEmail } from '@/emails/PaymentReceiptEmail'
import { sendWhatsAppMessage, sendWhatsAppTemplate } from '@/lib/whatsapp/client'
import { logActivity } from '@/lib/activity'
import { formatCurrency, getPaymentMethodLabel, getTodayDateString } from '@/lib/utils'
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
  paid_at?: string
}) {
  await requireAuth()
  const admin = createAdminClient()
  const paidAt = getValidPaidAt(data.paid_at)

  const { data: payment, error } = await admin
    .from('payments')
    .insert({ ...data, paid_at: paidAt })
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
    await logActivity(admin, {
      entity_type: 'payment',
      entity_id: payment.id,
      client_id: order.client_id,
      order_id: data.order_id,
      payment_id: payment.id,
      event_type: 'payment_created',
      message: `Abono registrado: ${formatCurrency(payment.amount)} para ${order.concept}`,
      metadata: { amount: payment.amount, payment_method: payment.payment_method, paid_at: payment.paid_at },
    })

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
            ].join('\n'),
          })
        }
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

export async function updatePayment(paymentId: string, data: {
  order_id: string
  amount: number
  concept: string
  payment_method: PaymentMethod
  payment_reference?: string
  notes?: string
  paid_at?: string
}) {
  await requireAuth()
  const admin = createAdminClient()

  if (!Number.isFinite(data.amount) || data.amount <= 0) {
    throw new Error('El monto debe ser mayor a 0')
  }

  const paidAt = getValidPaidAt(data.paid_at)

  const { data: payment, error } = await admin
    .from('payments')
    .update({
      amount: data.amount,
      concept: data.concept,
      payment_method: data.payment_method,
      payment_reference: data.payment_reference || null,
      notes: data.notes || null,
      paid_at: paidAt,
    })
    .eq('id', paymentId)
    .select('*, orders(client_id, concept)')
    .single()

  if (error) throw new Error(error.message)
  const paymentOrder = Array.isArray(payment.orders) ? payment.orders[0] : payment.orders

  await logActivity(admin, {
    entity_type: 'payment',
    entity_id: paymentId,
    client_id: paymentOrder.client_id,
    order_id: data.order_id,
    payment_id: paymentId,
    event_type: 'payment_updated',
    message: `Abono corregido: ${formatCurrency(data.amount)} para ${paymentOrder.concept}`,
    metadata: { amount: data.amount, payment_method: data.payment_method, paid_at: paidAt },
  })

  revalidatePath(`/admin/orders/${data.order_id}`)
  revalidatePath(`/admin/clients/${paymentOrder.client_id}`)
  revalidatePath('/admin/orders')
  revalidatePath('/admin')
  return payment
}

export async function resendPaymentReceipt(paymentId: string) {
  await requireAuth()
  const admin = createAdminClient()

  const { data: payment, error } = await admin
    .from('payments')
    .select('*, orders(*, clients(*))')
    .eq('id', paymentId)
    .single()

  if (error || !payment) {
    throw new Error(error?.message ?? 'Abono no encontrado')
  }

  const order = Array.isArray(payment.orders) ? payment.orders[0] : payment.orders
  const client = Array.isArray(order.clients) ? order.clients[0] : order.clients

  if (!client.email) {
    throw new Error('El cliente no tiene correo registrado')
  }

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: client.email,
    subject: `Recibo de abono — ${order.concept}`,
    react: PaymentReceiptEmail({
      clientName: client.name,
      concept: order.concept,
      paymentAmount: payment.amount,
      paymentDate: payment.paid_at ?? payment.created_at,
      paidAmount: order.paid_amount,
      totalAmount: order.total_amount,
      token: order.token,
      appUrl: process.env.NEXT_PUBLIC_APP_URL!,
    }),
  })

  await logActivity(admin, {
    entity_type: 'payment',
    entity_id: paymentId,
    client_id: order.client_id,
    order_id: order.id,
    payment_id: paymentId,
    event_type: 'payment_receipt_resent',
    message: `Recibo reenviado a ${client.email} para ${order.concept}`,
    metadata: { email: client.email, amount: payment.amount },
  })

  revalidatePath(`/admin/orders/${order.id}`)
  revalidatePath(`/admin/clients/${order.client_id}`)
}

function getValidPaidAt(value?: string) {
  const today = getTodayDateString()
  if (!value) return today

  if (value > today) {
    throw new Error('La fecha del abono no puede ser futura')
  }

  return value
}

export async function deletePayment(paymentId: string, orderId: string) {
  await requireAuth()
  const admin = createAdminClient()

  const { data: payment } = await admin
    .from('payments')
    .select('amount, concept, orders(client_id, concept)')
    .eq('id', paymentId)
    .single()

  const { error } = await admin
    .from('payments')
    .delete()
    .eq('id', paymentId)

  if (error) throw new Error(error.message)
  if (payment) {
    const paymentOrder = Array.isArray(payment.orders) ? payment.orders[0] : payment.orders
    await logActivity(admin, {
      entity_type: 'payment',
      entity_id: paymentId,
      client_id: paymentOrder.client_id,
      order_id: orderId,
      payment_id: paymentId,
      event_type: 'payment_deleted',
      message: `Abono eliminado: ${formatCurrency(payment.amount)} de ${paymentOrder.concept}`,
      metadata: { amount: payment.amount, concept: payment.concept },
    })
    revalidatePath(`/admin/clients/${paymentOrder.client_id}`)
  }
  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath('/admin/orders')
  revalidatePath('/admin')
}
