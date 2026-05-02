import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { Client, Order, Payment } from '@/types'

export type PublicClientOrder = Order & {
  payments: Payment[]
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
    .select('*')
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

  return {
    client: client as Client,
    orders: ((orders ?? []) as Order[]).map((order) => ({
      ...order,
      payments: paymentsByOrder.get(order.id) ?? [],
    })),
  }
}
