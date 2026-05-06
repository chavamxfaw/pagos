"use server"

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/admin'

async function requireAuth() {
  return requireAdmin()
}

export type ClientData = {
  name: string
  email?: string | null
  phone?: string | null
  company?: string | null
  rfc?: string | null
  address?: string | null
  notes?: string | null
}

function normalizeClientData(data: ClientData) {
  return {
    ...data,
    name: data.name.trim(),
    email: data.email?.trim() || null,
    phone: normalizePhone(data.phone),
    company: data.company?.trim() || null,
    rfc: data.rfc?.trim() || null,
    address: data.address?.trim() || null,
    notes: data.notes?.trim() || null,
  }
}

function normalizePhone(phone?: string | null) {
  const digits = phone?.replace(/\D/g, '') ?? ''
  return digits || null
}

export async function createClient_action(data: ClientData) {
  await requireAuth()
  const admin = createAdminClient()

  const { data: client, error } = await admin
    .from('clients')
    .insert(normalizeClientData(data))
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
    .update(normalizeClientData(data))
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
