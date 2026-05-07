"use server"

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth/admin'
import { getAdminNotifications } from '@/lib/admin-notifications'
import { createClient } from '@/lib/supabase/server'

export async function dismissAdminNotifications() {
  const user = await requireAdmin()
  const notifications = await getAdminNotifications()

  if (!notifications.length) return

  const supabase = await createClient()
  const dismissedAt = new Date().toISOString()
  const { error } = await supabase
    .from('admin_notification_dismissals')
    .upsert(
      notifications.map((notification) => ({
        user_id: user.id,
        notification_id: notification.id,
        fingerprint: notification.fingerprint,
        dismissed_at: dismissedAt,
      }))
    )

  if (error) throw new Error(error.message)

  revalidatePath('/admin')
}
