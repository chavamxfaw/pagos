"use server"

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function requireAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')
  return user
}

export async function createOrder(data: {
  client_id: string
  concept: string
  description?: string
  total_amount: number
}) {
  await requireAuth()
  const admin = createAdminClient()

  const { data: order, error } = await admin
    .from('orders')
    .insert(data)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/admin/orders')
  revalidatePath(`/admin/clients/${data.client_id}`)
  return order
}

export async function markOrderCompleted(orderId: string) {
  await requireAuth()
  const admin = createAdminClient()

  const { error } = await admin
    .from('orders')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', orderId)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/orders/${orderId}`)
  revalidatePath('/admin/orders')
  revalidatePath('/admin')
}

export async function deleteOrder(orderId: string, clientId: string) {
  await requireAuth()
  const admin = createAdminClient()

  const { error } = await admin
    .from('orders')
    .delete()
    .eq('id', orderId)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/orders')
  revalidatePath(`/admin/clients/${clientId}`)
  revalidatePath('/admin')
}
