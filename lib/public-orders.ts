import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { BankAccount, Payment, StripePaymentRequest } from '@/types'

const PUBLIC_COMPLETED_DAYS = 30

export async function getPublicOrder(token: string) {
  const admin = createAdminClient()

  const { data: order, error } = await admin
    .from('orders')
    .select('*, clients(*), bank_accounts(*)')
    .eq('token', token)
    .single()

  if (error || !order) return null

  if (isExpiredCompletedOrder(order.status, order.completed_at, order.paid_amount, order.total_amount)) {
    return null
  }

  const { data: payments } = await admin
    .from('payments')
    .select('*')
    .eq('order_id', order.id)
    .order('paid_at', { ascending: false })

  const { data: stripePaymentRequests } = await admin
    .from('stripe_payment_requests')
    .select('*')
    .eq('order_id', order.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return {
    order,
    payments: (payments ?? []) as Payment[],
    stripePaymentRequests: (stripePaymentRequests ?? []) as StripePaymentRequest[],
    bankAccount: (order.bank_accounts ?? null) as BankAccount | null,
  }
}

function isExpiredCompletedOrder(status: string, completedAt: string | null, paidAmount: number, totalAmount: number) {
  const isCompleted = status === 'completed' || (totalAmount > 0 && paidAmount >= totalAmount)
  if (!isCompleted) return false
  if (!completedAt) return false

  const completedTime = new Date(completedAt).getTime()
  const expiresAt = completedTime + PUBLIC_COMPLETED_DAYS * 24 * 60 * 60 * 1000

  return Date.now() > expiresAt
}
