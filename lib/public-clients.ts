import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { BankAccount, Client, FiscalDocument, Order, Payment, StripePaymentRequest } from '@/types'

const PUBLIC_COMPLETED_DAYS = 30

export type PublicClientOrder = Order & {
  payments: Payment[]
  bank_accounts: BankAccount | null
  fiscal_documents: FiscalDocument | null
  stripe_payment_requests: StripePaymentRequest[]
}

export async function getPublicClientPortal(token: string) {
  const admin = createAdminClient()

  const { data: client, error } = await admin
    .from('clients')
    .select('*')
    .eq('client_portal_token', token)
    .eq('client_portal_enabled', true)
    .single()

  if (error || !client) return null

  const { data: orders } = await admin
    .from('orders')
    .select('*, bank_accounts(*), fiscal_documents(*)')
    .eq('client_id', client.id)
    .order('public_sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  const visibleOrders = ((orders ?? []) as (Order & {
    bank_accounts: BankAccount | null
    fiscal_documents: FiscalDocument | null
  })[]).filter((order) => !isExpiredCompletedOrder(order.status, order.completed_at, order.paid_amount, order.total_amount))

  const orderIds = visibleOrders.map((order) => order.id)
  const { data: payments } = orderIds.length
    ? await admin
        .from('payments')
        .select('*')
        .in('order_id', orderIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  const paymentsByOrder = new Map<string, Payment[]>()
  for (const payment of (payments ?? []) as Payment[]) {
    const existing = paymentsByOrder.get(payment.order_id) ?? []
    existing.push(payment)
    paymentsByOrder.set(payment.order_id, existing)
  }

  const { data: stripePaymentRequests } = orderIds.length
    ? await admin
        .from('stripe_payment_requests')
        .select('*')
        .in('order_id', orderIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
    : { data: [] }

  const requestsByOrder = new Map<string, StripePaymentRequest[]>()
  for (const request of (stripePaymentRequests ?? []) as StripePaymentRequest[]) {
    const existing = requestsByOrder.get(request.order_id) ?? []
    existing.push(request)
    requestsByOrder.set(request.order_id, existing)
  }

  return {
    client: client as Client,
    orders: visibleOrders.map((order) => ({
      ...order,
      payments: paymentsByOrder.get(order.id) ?? [],
      stripe_payment_requests: requestsByOrder.get(order.id) ?? [],
    })),
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
