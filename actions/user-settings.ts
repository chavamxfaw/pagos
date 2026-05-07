"use server"

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/admin'
import type { UserSettings } from '@/types'

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

export async function saveNotificationSettings(formData: FormData) {
  const user = await requireAuth()
  const adminPhone = String(formData.get('admin_phone') ?? '').trim() || null
  const notifyStripeEmail = formData.get('notify_stripe_email') === 'on'
  const notifyStripeWhatsapp = formData.get('notify_stripe_whatsapp') === 'on'

  const admin = createAdminClient()
  const { error } = await admin
    .from('user_settings')
    .upsert({
      user_id: user.id,
      admin_phone: adminPhone,
      notify_stripe_email: notifyStripeEmail,
      notify_stripe_whatsapp: notifyStripeWhatsapp,
      updated_at: new Date().toISOString(),
    })

  if (error) throw new Error(error.message)

  revalidatePath('/admin/profile')
  revalidatePath('/admin')
}
