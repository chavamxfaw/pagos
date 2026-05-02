import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/admin/Sidebar'
import { SessionTimeout } from '@/components/admin/SessionTimeout'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-900">
      <div className="hidden md:flex">
        <Sidebar userEmail={user.email!} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-zinc-950/80 backdrop-blur border-b border-zinc-800/60 flex items-center px-6 shrink-0">
          <span className="text-zinc-500 text-sm">chcv</span>
          <span className="text-zinc-700 mx-2 text-sm">/</span>
          <span className="text-zinc-300 text-sm font-medium">Panel de administración</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <SessionTimeout />
          {children}
        </main>
      </div>
    </div>
  )
}
