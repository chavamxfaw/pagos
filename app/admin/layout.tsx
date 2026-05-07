import { redirect } from 'next/navigation'
import { MobileAdminNav, Sidebar } from '@/components/admin/Sidebar'
import { SessionTimeout } from '@/components/admin/SessionTimeout'
import { AdminUserMenu } from '@/components/admin/AdminUserMenu'
import { AdminNotifications } from '@/components/admin/AdminNotifications'
import { GlobalSearch } from '@/components/admin/GlobalSearch'
import { getDisplayName } from '@/actions/user-settings'
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
  const supabase = await createClient()
  const [
    displayName,
    { data: clients },
    { data: orders },
  ] = await Promise.all([
    getDisplayName(user.id, email),
    supabase.from('clients').select('*').order('name', { ascending: true }).limit(200),
    supabase.from('orders').select('*, clients(*)').order('created_at', { ascending: false }).limit(250),
  ])

  const searchableClients = (clients ?? []) as Client[]
  const searchableOrders = (orders ?? []) as OrderWithClient[]
  const initials = displayName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() || email[0].toUpperCase()

  return (
    <div className="flex h-dvh min-w-0 overflow-hidden bg-white">
      <div className="hidden md:flex">
        <Sidebar userEmail={email} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="relative z-[100] grid min-h-16 shrink-0 grid-cols-[1fr_auto] items-center gap-3 overflow-visible border-b border-[#E6EAF0] bg-white/95 px-4 py-2 backdrop-blur md:h-16 md:grid-cols-[minmax(220px,1fr)_minmax(280px,520px)_minmax(220px,1fr)] md:px-6 md:py-0">
          <div className="flex min-w-0 items-center gap-3">
            <MobileAdminNav userEmail={email} />
            <div className="hidden min-w-0 sm:block">
              <span className="text-sm text-[#6B7280]">otla</span>
              <span className="mx-2 text-sm text-[#A2ABBA]">/</span>
              <span className="text-sm font-semibold text-[#1A1F36]">Panel de administración</span>
            </div>
          </div>

          <div className="order-3 col-span-2 min-w-0 md:order-none md:col-span-1">
            <GlobalSearch clients={searchableClients} orders={searchableOrders} />
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3">
            <AdminNotifications />
            <AdminUserMenu email={email} displayName={displayName} initials={initials} />
          </div>
        </header>

        {/* Page content */}
        <main className="relative z-0 min-w-0 flex-1 overflow-y-auto bg-white">
          <SessionTimeout />
          {children}
        </main>
      </div>
    </div>
  )
}
