"use server"

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/admin'

async function requireAuth() {
  return requireAdmin()
}

export async function getDisplayName(userId: string, email: string): Promise<string> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('user_settings')
    .select('display_name')
    .eq('user_id', userId)
    .single()
  return data?.display_name || email
}

export async function saveDisplayName(displayName: string) {
  const user = await requireAuth()
  const trimmed = displayName.trim()
  if (!trimmed) throw new Error('El nombre no puede estar vacío')

  const admin = createAdminClient()
  const { error } = await admin
    .from('user_settings')
    .upsert({ user_id: user.id, display_name: trimmed, updated_at: new Date().toISOString() })

  if (error) throw new Error(error.message)

  revalidatePath('/admin/profile')
  revalidatePath('/admin')
}
