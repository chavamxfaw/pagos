"use server"

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/admin'
import { getDisplayName } from '@/lib/user-settings'
import { sendOrderReminderNotification } from '@/lib/order-reminder-notifications'

async function requireAuth() {
  return requireAdmin()
}

export async function sendOrderReminder(orderId: string) {
  const user = await requireAuth()
  const admin = createAdminClient()

  const senderName = await getDisplayName(user.id, user.email!)

  const { data: order, error } = await admin
    .from('orders')
    .select('*, clients(*)')
    .eq('id', orderId)
    .single()

  if (error || !order) throw new Error(error?.message ?? 'Orden no encontrada')

  const result = await sendOrderReminderNotification({
    admin,
    order,
    senderName,
    source: 'manual',
  })

  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath(`/admin/clients/${order.client_id}`)

  return result
}
