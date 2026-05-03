'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Home, LogOut, Menu, Package, Rocket, Users, X } from 'lucide-react'
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
          ? 'bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-white font-semibold shadow-[0_12px_28px_rgba(74,139,255,0.28)]'
          : 'text-white/65 hover:bg-white/8 hover:text-white'
      )}
    >
      <span className={cn(isActive ? 'text-white' : 'text-white/45')}>
        {item.icon}
      </span>
      {item.label}
      {isActive && (
        <span className="ml-auto size-1.5 rounded-full bg-white/80" />
      )}
    </Link>
  )
}

export function Sidebar({ userEmail }: { userEmail: string }) {
  return (
    <aside className="relative flex w-64 shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#0F172A]">
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-[#6C5CE7]/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-20 h-80 w-80 rounded-full bg-[#4A8BFF]/20 blur-3xl" />
      {/* Logo */}
      <div className="relative flex min-h-36 flex-col items-center justify-center border-b border-white/10 px-5 py-5 text-center">
        <Image src="/otla-white.png" alt="OTLA" width={148} height={118} className="h-16 w-auto object-contain" priority />
        <div className="mt-2 min-w-0">
          <p className="text-xs text-white/55">Control de pagos.</p>
          <p className="text-xs text-white/55">Claridad en tu camino<span className="ml-1 text-[#6C5CE7]">•</span></p>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 space-y-6 overflow-y-auto px-4 py-6">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="relative border-t border-white/10 px-4 py-4">
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div className="mb-3 flex items-center gap-2 text-white">
            <span className="flex size-8 items-center justify-center rounded-xl bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)]">
              <Rocket className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">OTLA</p>
              <p className="text-xs text-white/50">Cobros y seguimiento</p>
            </div>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-3/4 rounded-full bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)]" />
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-white/[0.06] px-3 py-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] shadow-lg shadow-[#4A8BFF]/20">
            <span className="text-xs font-bold uppercase text-white">
              {userEmail[0]}
            </span>
          </div>
          <p className="flex-1 truncate text-xs text-white/70">{userEmail}</p>
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
      <aside className="absolute inset-y-0 left-0 flex w-[min(20rem,86vw)] flex-col border-r border-white/10 bg-[#0F172A] shadow-2xl">
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
