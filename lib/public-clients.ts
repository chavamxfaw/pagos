import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { BankAccount, Client, Order, Payment, StripePaymentRequest } from '@/types'

export type PublicClientOrder = Order & {
  payments: Payment[]
  bank_accounts: BankAccount | null
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
    .select('*, bank_accounts(*)')
    .eq('client_id', client.id)
    .order('created_at', { ascending: false })

  const orderIds = (orders ?? []).map((order) => order.id)
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
    orders: ((orders ?? []) as (Order & { bank_accounts: BankAccount | null })[]).map((order) => ({
      ...order,
      payments: paymentsByOrder.get(order.id) ?? [],
      stripe_payment_requests: requestsByOrder.get(order.id) ?? [],
    })),
  }
}
