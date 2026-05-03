'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Home, LogOut, Menu, Package, Users, X } from 'lucide-react'
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
        icon: <Home className="size-4" />,
      },
    ],
  },
  {
    title: 'GESTIÓN',
    items: [
      {
        label: 'Clientes',
        href: '/admin/clients',
        icon: <Users className="size-4" />,
      },
      {
        label: 'Órdenes',
        href: '/admin/orders',
        icon: <Package className="size-4" />,
      },
    ],
  },
]

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname()
  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
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

export function MobileAdminNav({ userEmail }: { userEmail: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex size-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-zinc-50 md:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>

      {open && createPortal(
        <MobileDrawer userEmail={userEmail} onClose={() => setOpen(false)} />,
        document.body
      )}
    </>
  )
}

function MobileDrawer({
  userEmail,
  onClose,
}: {
  userEmail: string
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[9999] md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-label="Cerrar menú"
      />
      <aside className="absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col border-r border-zinc-800 bg-zinc-950 shadow-2xl">
        <div className="flex h-16 items-center justify-between border-b border-zinc-800/60 px-5">
          <span className="font-heading text-xl font-bold uppercase tracking-widest text-zinc-50">CHCV</span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-100"
            aria-label="Cerrar menú"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink key={item.href} item={item} onNavigate={onClose} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-zinc-800/60 px-3 py-4">
          <div className="flex items-center gap-3 rounded-lg bg-zinc-900 px-3 py-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/20">
              <span className="text-xs font-bold uppercase text-emerald-400">{userEmail[0]}</span>
            </div>
            <p className="min-w-0 flex-1 truncate text-xs text-zinc-400">{userEmail}</p>
            <LogoutIcon />
          </div>
        </div>
      </aside>
    </div>
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
      <LogOut className="size-4" />
    </button>
  )
}
