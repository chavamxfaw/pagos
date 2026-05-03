'use client'

import Link from 'next/link'
import Image from 'next/image'
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
          ? 'bg-white/12 text-white font-medium shadow-sm'
          : 'text-white/65 hover:bg-white/8 hover:text-white'
      )}
    >
      <span className={cn(isActive ? 'text-[#2ED39A]' : 'text-white/45')}>
        {item.icon}
      </span>
      {item.label}
      {isActive && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#2ED39A]" />
      )}
    </Link>
  )
}

export function Sidebar({ userEmail }: { userEmail: string }) {
  return (
    <aside className="flex flex-col w-64 bg-[#1A1F36] border-r border-white/10 shrink-0">
      {/* Logo */}
      <div className="flex items-center px-5 h-16 border-b border-white/10">
        <Image src="/otla-white.png" alt="OTLA" width={128} height={102} className="h-10 w-auto object-contain" priority />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold text-white/35 uppercase tracking-widest">
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
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/8">
          <div className="w-7 h-7 rounded-full bg-[#2ED39A]/20 border border-[#2ED39A]/30 flex items-center justify-center shrink-0">
            <span className="text-[#2ED39A] text-xs font-bold uppercase">
              {userEmail[0]}
            </span>
          </div>
          <p className="text-white/65 text-xs truncate flex-1">{userEmail}</p>
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
        className="inline-flex size-9 items-center justify-center rounded-lg border border-[#E6EAF0] bg-white text-[#1A1F36] shadow-sm transition-colors hover:bg-[#EEF2FF] md:hidden"
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
      <aside className="absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col border-r border-white/10 bg-[#1A1F36] shadow-2xl">
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <Image src="/otla-white.png" alt="OTLA" width={128} height={102} className="h-10 w-auto object-contain" priority />
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/8 hover:text-white"
            aria-label="Cerrar menú"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/35">
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

        <div className="border-t border-white/10 px-3 py-4">
          <div className="flex items-center gap-3 rounded-lg bg-white/8 px-3 py-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[#2ED39A]/30 bg-[#2ED39A]/20">
              <span className="text-xs font-bold uppercase text-[#2ED39A]">{userEmail[0]}</span>
            </div>
            <p className="min-w-0 flex-1 truncate text-xs text-white/65">{userEmail}</p>
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
    <button onClick={handleLogout} className="text-white/45 hover:text-white transition-colors shrink-0" title="Cerrar sesión">
      <LogOut className="size-4" />
    </button>
  )
}
