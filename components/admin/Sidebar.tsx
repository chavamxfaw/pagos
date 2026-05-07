'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  CreditCard,
  FileText,
  Home,
  LogOut,
  Menu,
  Package,
  Rocket,
  Settings,
  Users,
  WalletCards,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  label: string
  href: string
  exact?: boolean
  icon: React.ReactNode
}

type NavGroup = {
  label: string
  icon: React.ReactNode
  items: NavItem[]
}

type SectionItem = NavItem | NavGroup

const sections: { title: string; items: SectionItem[] }[] = [
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
  {
    title: 'CONFIGURACIÓN',
    items: [
      {
        label: 'Ajustes',
        icon: <Settings className="size-4" />,
        items: [
          {
            label: 'Datos bancarios',
            href: '/admin/settings/bank-accounts',
            icon: <CreditCard className="size-4" />,
          },
          {
            label: 'Docs fiscales',
            href: '/admin/settings/fiscal-documents',
            icon: <FileText className="size-4" />,
          },
          {
            label: 'Stripe',
            href: '/admin/settings/stripe',
            icon: <WalletCards className="size-4" />,
          },
        ],
      },
    ],
  },
  {
    title: 'CUENTA',
    items: [
      {
        label: 'Mi perfil',
        href: '/admin/profile',
        icon: <Settings className="size-4" />,
      },
    ],
  },
]

function isNavGroup(item: SectionItem): item is NavGroup {
  return 'items' in item
}

function NavLink({
  item,
  collapsed = false,
  nested = false,
  onNavigate,
}: {
  item: NavItem
  collapsed?: boolean
  nested?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={cn(
        'group/nav flex min-h-10 items-center rounded-lg text-sm transition-all',
        collapsed ? 'justify-center px-0' : 'gap-3 px-3',
        nested && !collapsed ? 'py-2 pl-9 text-[13px]' : 'py-2.5',
        isActive
          ? 'bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-white font-semibold shadow-[0_12px_28px_rgba(74,139,255,0.28)]'
          : 'text-white/65 hover:bg-white/8 hover:text-white'
      )}
    >
      <span className={cn(isActive ? 'text-white' : 'text-white/45')}>
        {item.icon}
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
      {isActive && !collapsed && (
        <span className="ml-auto size-1.5 rounded-full bg-white/80" />
      )}
    </Link>
  )
}

export function Sidebar({ userEmail }: { userEmail: string }) {
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('otla-sidebar-collapsed') === 'true'
  })

  function setSidebarCollapsed(value: boolean) {
    localStorage.setItem('otla-sidebar-collapsed', String(value))
    setCollapsed(value)
  }

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current
      localStorage.setItem('otla-sidebar-collapsed', String(next))
      return next
    })
  }

  return (
    <aside
      className={cn(
        'relative flex shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#0F172A] transition-[width] duration-200 ease-out',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      <div className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-[#6C5CE7]/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-20 h-80 w-80 rounded-full bg-[#4A8BFF]/20 blur-3xl" />
      {/* Logo */}
      <div className={cn('relative flex flex-col border-b border-white/10 px-4 py-5', collapsed ? 'min-h-32 items-center justify-center' : 'min-h-36 items-center justify-center text-center')}>
        <Image src="/otla-white.png" alt="OTLA" width={148} height={118} className={cn('w-auto object-contain', collapsed ? 'h-10' : 'h-16')} priority />
        {!collapsed && (
          <div className="mt-2 min-w-0">
            <p className="text-xs text-white/55">Control de pagos.</p>
          </div>
        )}
        {collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="mt-3 hidden size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.08] text-white/70 transition-colors hover:bg-white/12 hover:text-white md:inline-flex"
            aria-label="Expandir sidebar"
            title="Expandir sidebar"
          >
            <ChevronsRight className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleCollapsed}
            className="absolute right-3 top-3 hidden size-8 items-center justify-center rounded-lg text-white/55 transition-colors hover:bg-white/8 hover:text-white md:inline-flex"
            aria-label="Contraer sidebar"
            title="Contraer sidebar"
          >
            <ChevronsLeft className="size-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className={cn('relative flex-1 overflow-y-auto py-6', collapsed ? 'space-y-4 px-3' : 'space-y-6 px-4')}>
        {sections.map((section) => (
          <div key={section.title}>
            {collapsed ? (
              <div className="mx-auto mb-2 h-px w-6 bg-white/10" />
            ) : (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/38">
                {section.title}
              </p>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                isNavGroup(item) ? (
                  <NavAccordion
                    key={item.label}
                    group={item}
                    collapsed={collapsed}
                    onExpandSidebar={() => setSidebarCollapsed(false)}
                  />
                ) : (
                  <NavLink key={item.href} item={item} collapsed={collapsed} />
                )
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className={cn('relative border-t border-white/10 py-4', collapsed ? 'px-3' : 'px-4')}>
        {!collapsed && (
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
        )}

        <div className={cn('flex items-center rounded-2xl bg-white/[0.06] py-2.5', collapsed ? 'justify-center px-0' : 'gap-3 px-3')}>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] shadow-lg shadow-[#4A8BFF]/20">
            <span className="text-xs font-bold uppercase text-white">
              {userEmail[0]}
            </span>
          </div>
          {!collapsed && (
            <>
              <p className="flex-1 truncate text-xs text-white/70">{userEmail}</p>
              <LogoutIcon />
            </>
          )}
        </div>
      </div>
    </aside>
  )
}

function NavAccordion({
  group,
  collapsed,
  onExpandSidebar,
  onNavigate,
}: {
  group: NavGroup
  collapsed?: boolean
  onExpandSidebar?: () => void
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const groupActive = group.items.some((item) => pathname.startsWith(item.href))
  const [manuallyOpen, setManuallyOpen] = useState(false)
  const open = groupActive || manuallyOpen

  function handleToggle() {
    if (collapsed) {
      onExpandSidebar?.()
      setManuallyOpen(true)
      return
    }
    setManuallyOpen((current) => !current)
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleToggle}
        title={collapsed ? group.label : undefined}
        className={cn(
          'flex min-h-10 w-full items-center rounded-lg text-sm transition-all',
          collapsed ? 'justify-center px-0' : 'gap-3 px-3 py-2.5',
          groupActive
            ? 'bg-white/10 text-white'
            : 'text-white/65 hover:bg-white/8 hover:text-white'
        )}
      >
        <span className={cn(groupActive ? 'text-white' : 'text-white/45')}>{group.icon}</span>
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">{group.label}</span>
            <ChevronDown className={cn('size-4 text-white/45 transition-transform', open && 'rotate-180')} />
          </>
        )}
      </button>

      {!collapsed && open && (
        <div className="mt-1 space-y-1">
          {group.items.map((item) => (
            <NavLink key={item.href} item={item} nested onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
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
                  isNavGroup(item) ? (
                    <NavAccordion key={item.label} group={item} onNavigate={onClose} />
                  ) : (
                    <NavLink key={item.href} item={item} onNavigate={onClose} />
                  )
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
