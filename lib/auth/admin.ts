import 'server-only'

import { createClient } from '@/lib/supabase/server'

export async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('No autorizado')
  }

  const { data: adminUser, error } = await supabase
    .from('app_admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !adminUser) {
    throw new Error('No autorizado')
  }

  return user
}
