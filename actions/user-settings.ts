"use server"

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/auth/admin'

async function requireAuth() {
  return requireAdmin()
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
