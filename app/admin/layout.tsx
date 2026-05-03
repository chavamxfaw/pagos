import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MobileAdminNav, Sidebar } from '@/components/admin/Sidebar'
import { SessionTimeout } from '@/components/admin/SessionTimeout'
import { AdminUserMenu } from '@/components/admin/AdminUserMenu'
import { Bell } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const email = user.email!
  const displayName = email.split('@')[0].split(/[._-]/).filter(Boolean).map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
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
            <button
              type="button"
              className="relative hidden size-10 items-center justify-center rounded-full border border-[#E6EAF0] bg-white text-[#1A1F36] shadow-sm transition-colors hover:bg-[#F8FAFF] sm:inline-flex"
              aria-label="Notificaciones"
            >
              <Bell className="size-4" />
              <span className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-[10px] font-bold text-white">
                3
              </span>
            </button>
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
