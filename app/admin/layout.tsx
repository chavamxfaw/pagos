import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MobileAdminNav, Sidebar } from '@/components/admin/Sidebar'
import { SessionTimeout } from '@/components/admin/SessionTimeout'
import { AdminUserMenu } from '@/components/admin/AdminUserMenu'
import { AdminNotifications } from '@/components/admin/AdminNotifications'
import { getDisplayName } from '@/actions/user-settings'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const email = user.email!
  const displayName = await getDisplayName(user.id, email)
  const initials = displayName.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase() || email[0].toUpperCase()

  return (
    <div className="flex h-dvh overflow-hidden bg-[#F5F7FB]">
      <div className="hidden md:flex">
        <Sidebar userEmail={email} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[#E6EAF0] bg-white/90 px-4 backdrop-blur md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <MobileAdminNav userEmail={email} />
            <div className="min-w-0">
              <span className="text-sm text-[#6B7280]">otla</span>
              <span className="mx-2 text-sm text-[#A2ABBA]">/</span>
              <span className="text-sm font-semibold text-[#1A1F36]">Panel de administración</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <AdminNotifications />
            <AdminUserMenu email={email} displayName={displayName} initials={initials} />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <SessionTimeout />
          {children}
        </main>
      </div>
    </div>
  )
}
