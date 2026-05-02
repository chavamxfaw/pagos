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

export type ClientData = {
  name: string
  email: string
  phone?: string
  company?: string
  rfc?: string
  address?: string
  notes?: string
}

export async function createClient_action(data: ClientData) {
  await requireAuth()
  const admin = createAdminClient()

  const { data: client, error } = await admin
    .from('clients')
    .insert(data)
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/admin/clients')
  return client
}

export async function updateClient(id: string, data: ClientData) {
  await requireAuth()
  const admin = createAdminClient()

  const { error } = await admin
    .from('clients')
    .update(data)
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/clients')
  revalidatePath(`/admin/clients/${id}`)
}

export async function setClientPortalEnabled(id: string, enabled: boolean) {
  await requireAuth()
  const admin = createAdminClient()

  const { error } = await admin
    .from('clients')
    .update({ client_portal_enabled: enabled })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/clients/${id}`)
}

export async function deleteClient(id: string) {
  await requireAuth()
  const admin = createAdminClient()

  const { error } = await admin
    .from('clients')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/clients')
  revalidatePath('/admin/orders')
  revalidatePath('/admin')
}
