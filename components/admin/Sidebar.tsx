'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

type NavItem = {
  label: string
  href: string
  exact?: boolean
  icon: React.ReactNode
}

const sections = [
  {
    title: 'PRINCIPAL',
    items: [
      {
        label: 'Dashboard',
        href: '/admin',
        exact: true,
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        ),
      },
    ],
  },
  {
    title: 'GESTIÓN',
    items: [
      {
        label: 'Clientes',
        href: '/admin/clients',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
      {
        label: 'Órdenes',
        href: '/admin/orders',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        ),
      },
    ],
  },
]

function NavLink({ item }: { item: NavItem }) {
  const pathname = usePathname()
  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all',
        isActive
          ? 'bg-emerald-500/15 text-emerald-400 font-medium'
          : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
      )}
    >
      <span className={cn(isActive ? 'text-emerald-400' : 'text-zinc-500')}>
        {item.icon}
      </span>
      {item.label}
      {isActive && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />
      )}
    </Link>
  )
}

export function Sidebar({ userEmail }: { userEmail: string }) {
  return (
    <aside className="flex flex-col w-64 bg-zinc-950 border-r border-zinc-800/60 shrink-0">
      {/* Logo */}
      <div className="flex items-center px-5 h-16 border-b border-zinc-800/60">
        <span className="text-zinc-50 font-heading font-bold text-xl tracking-widest uppercase">CHCV</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-zinc-800/60">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-zinc-900">
          <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <span className="text-emerald-400 text-xs font-bold uppercase">
              {userEmail[0]}
            </span>
          </div>
          <p className="text-zinc-400 text-xs truncate flex-1">{userEmail}</p>
          <LogoutIcon />
        </div>
      </div>
    </aside>
  )
}

function LogoutIcon() {
  async function handleLogout() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <button onClick={handleLogout} className="text-zinc-600 hover:text-zinc-300 transition-colors shrink-0" title="Cerrar sesión">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
    </button>
  )
}
