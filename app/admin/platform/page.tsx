import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { requirePlatformOwner } from '@/lib/crm/platform'
import { Accounts } from './Accounts'

export default async function Page() {
  await requireAdmin()
  if (!process.env.PLATFORM_OWNER_USER_ID?.trim()) return <div className="mx-auto max-w-4xl p-8"><h1 className="text-2xl font-semibold tracking-tight">Plataforma</h1><div className="mt-8 rounded-xl border border-border bg-white p-6"><h2 className="font-medium">Cuenta maestra pendiente</h2><p className="mt-2 text-sm text-muted-foreground">Configura el identificador del propietario para habilitar este apartado.</p></div></div>
  let owner
  try { owner = await requirePlatformOwner() } catch { notFound() }
  const { data, error } = await createAdminClient().from('platform_accounts').select('id,name,status,plan,contact_name,contact_email,notes').eq('owner_user_id', owner.id).order('created_at', { ascending: false }).limit(1000)
  return <Accounts accounts={data ?? []} error={error ? 'No se pudieron cargar las cuentas. Comprueba que el módulo esté habilitado.' : undefined} />
}
