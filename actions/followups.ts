"use server"

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/admin'
import { logActivity } from '@/lib/activity'
import type { ClientFollowup } from '@/types'

async function requireAuth() {
  return requireAdmin()
}

export async function addClientFollowup(data: {
  client_id: string
  note_type: ClientFollowup['note_type']
  content: string
  follow_up_date?: string
}) {
  await requireAuth()
  const admin = createAdminClient()

  const { data: followup, error } = await admin
    .from('client_followups')
    .insert({
      client_id: data.client_id,
      note_type: data.note_type,
      content: data.content.trim(),
      follow_up_date: data.follow_up_date || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  await logActivity(admin, {
    entity_type: 'client',
    entity_id: data.client_id,
    client_id: data.client_id,
    event_type: 'followup_created',
    message: `Seguimiento agregado: ${data.content.trim()}`,
    metadata: { note_type: data.note_type, follow_up_date: data.follow_up_date || null },
  })

  revalidatePath(`/admin/clients/${data.client_id}`)
  return followup
}

export async function deleteClientFollowup(id: string, clientId: string) {
  await requireAuth()
  const admin = createAdminClient()

  const { error } = await admin
    .from('client_followups')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath(`/admin/clients/${clientId}`)
}
