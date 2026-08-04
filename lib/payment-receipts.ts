import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { Client, Order, Payment } from '@/types'

export type PublicPaymentReceipt = {
  payment: Payment
  order: Order & { clients: Client }
}

export async function getPublicPaymentReceipt(token: string): Promise<PublicPaymentReceipt | null> {
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('payments')
    .select('*, orders(*, clients(*))')
    .eq('receipt_token', token)
    .single()

  if (error || !data) return null

  const order = Array.isArray(data.orders) ? data.orders[0] : data.orders
  if (!order?.clients) return null

  return {
    payment: data as Payment,
    order: order as Order & { clients: Client },
  }
}
