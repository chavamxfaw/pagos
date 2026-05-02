"use server"

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { resend } from '@/lib/resend/client'
import { PaymentReceiptEmail } from '@/emails/PaymentReceiptEmail'

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

  // Enviar correo — si falla no hacemos rollback
  if (order?.clients) {
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
