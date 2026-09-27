import { redirect } from 'next/navigation'
import { MobileAdminNav, Sidebar } from '@/components/admin/Sidebar'
import { SessionTimeout } from '@/components/admin/SessionTimeout'
import { AdminUserMenu } from '@/components/admin/AdminUserMenu'
import { AdminNotifications } from '@/components/admin/AdminNotifications'
import { GlobalSearch } from '@/components/admin/GlobalSearch'
import { getDisplayName } from '@/lib/user-settings'
import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import type { Client, OrderWithClient } from '@/types'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let user
  try {
    user = await requireAdmin()
  } catch {
    redirect('/login')
  }

  const email = user.email!
  const isPlatformOwner = Boolean(process.env.PLATFORM_OWNER_USER_ID?.trim()) && user.id === process.env.PLATFORM_OWNER_USER_ID?.trim()
  const supabase = await createClient()
  const [
    displayName,
    { data: clients, error: clientsError },
    { data: orders, error: ordersError },
  ] = await Promise.all([
    getDisplayName(user.id, email),
    supabase.from('clients').select('*').order('name', { ascending: true }).limit(200),
    supabase.from('orders').select('*, clients(*)').order('created_at', { ascending: false }).limit(250),
  ])

  const searchableClients = (clients ?? []) as Client[]
  const searchableOrders = (orders ?? []) as OrderWithClient[]
  const initials = displayName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() || email[0].toUpperCase()

  return (
    <div className="flex h-dvh min-w-0 overflow-hidden bg-background text-foreground">
      <a href="#main-content" className="sr-only fixed left-4 top-4 z-[200] rounded-lg bg-white p-3 focus:not-sr-only">Ir al contenido</a>
      <div className="hidden md:flex">
        <Sidebar userEmail={email} isPlatformOwner={isPlatformOwner} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="relative z-20 grid min-h-16 shrink-0 grid-cols-[1fr_auto] items-center gap-3 border-b bg-white px-4 py-2 lg:grid-cols-[1fr_minmax(220px,440px)_auto] lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <MobileAdminNav userEmail={email} isPlatformOwner={isPlatformOwner} />
            <div className="hidden min-w-0 sm:block">
              <span className="text-sm text-muted-foreground">Mi negocio</span>
            </div>
          </div>

          <div className="order-3 col-span-2 min-w-0 lg:order-none lg:col-span-1">
            {clientsError || ordersError ? <p role="status" className="text-xs text-muted-foreground">La búsqueda no está disponible. Recarga para reintentar.</p> : <GlobalSearch clients={searchableClients} orders={searchableOrders} />}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3">
            <AdminNotifications />
            <AdminUserMenu email={email} displayName={displayName} initials={initials} />
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="relative z-0 min-w-0 flex-1 overflow-y-auto bg-background">
          <SessionTimeout />
          {children}
        </main>
      </div>
    </div>
  )
}
