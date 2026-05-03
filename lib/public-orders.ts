import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { BankAccount, Payment } from '@/types'

const PUBLIC_COMPLETED_DAYS = 30

export async function getPublicOrder(token: string) {
  const admin = createAdminClient()

  const { data: order, error } = await admin
    .from('orders')
    .select('*, clients(*), bank_accounts(*)')
    .eq('token', token)
    .single()

  if (error || !order) return null

  if (isExpiredCompletedOrder(order.status, order.completed_at)) {
    return null
  }

  const { data: payments } = await admin
    .from('payments')
    .select('*')
    .eq('order_id', order.id)
    .order('paid_at', { ascending: false })

  return {
    order,
    payments: (payments ?? []) as Payment[],
    bankAccount: (order.bank_accounts ?? null) as BankAccount | null,
  }
}

function isExpiredCompletedOrder(status: string, completedAt: string | null) {
  if (status !== 'completed' || !completedAt) return false

  const completedTime = new Date(completedAt).getTime()
  const expiresAt = completedTime + PUBLIC_COMPLETED_DAYS * 24 * 60 * 60 * 1000

  return Date.now() > expiresAt
}
