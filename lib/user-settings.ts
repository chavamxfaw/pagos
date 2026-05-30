import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { UserSettings } from '@/types'

export async function getDisplayName(userId: string, email: string): Promise<string> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('user_settings')
    .select('display_name')
    .eq('user_id', userId)
    .single()

  return data?.display_name || email
}

export async function getUserSettings(userId: string, email: string): Promise<UserSettings> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  return {
    user_id: userId,
    display_name: data?.display_name ?? email,
    admin_phone: data?.admin_phone ?? null,
    notify_stripe_email: data?.notify_stripe_email ?? true,
    notify_stripe_whatsapp: data?.notify_stripe_whatsapp ?? false,
    created_at: data?.created_at ?? new Date().toISOString(),
    updated_at: data?.updated_at ?? new Date().toISOString(),
  }
}
