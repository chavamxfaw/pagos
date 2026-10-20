'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { CalendarDays, ChevronDown, CreditCard, FileText, Home, LogOut, Menu, MessageCircle, PanelLeftClose, PanelLeftOpen, Settings, Users, WalletCards, Plus, ChartNoAxesCombined } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const navigation = [
  { label: 'Inicio', href: '/admin', icon: Home },
  { label: 'Pagos', href: '/admin/orders', icon: WalletCards },
  { label: 'Contactos', href: '/admin/clients', icon: Users },
  { label: 'Agenda', href: '/admin/calendar', icon: CalendarDays },
  { label: 'Comunicación', href: '/admin/messages', icon: MessageCircle },
]
const settings = [
  { label: 'Datos bancarios', href: '/admin/settings/bank-accounts', icon: CreditCard },
  { label: 'Documentos fiscales', href: '/admin/settings/fiscal-documents', icon: FileText },
  { label: 'Stripe', href: '/admin/settings/stripe', icon: WalletCards },
  { label: 'Mi perfil', href: '/admin/profile', icon: Settings },
]
const categoryDots: Record<string, string> = {
  '/admin/orders': 'otla-dot-payments',
  '/admin/clients': 'otla-dot-contacts',
  '/admin/calendar': 'otla-dot-calendar',
  '/admin/messages': 'otla-dot-messages',
}

function Navigation({ onNavigate, collapsed = false }: { onNavigate?: () => void; isPlatformOwner?: boolean; collapsed?: boolean }) {
  const pathname = usePathname()
  function renderLink(item: typeof navigation[number]) {
    const active = item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href)
    const Icon = item.icon
    return <Link key={item.href} href={item.href} onClick={onNavigate} title={collapsed ? item.label : undefined} aria-current={active ? 'page' : undefined} className={cn('flex min-h-11 items-center gap-2 rounded-md px-2 text-[13px] transition-colors md:min-h-9 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring', collapsed && 'justify-center', active ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground')}><Icon aria-hidden="true" className="size-4 shrink-0" /><span className={collapsed ? 'sr-only' : undefined}>{item.label}</span>{!collapsed && categoryDots[item.href] && <span aria-hidden="true" className={cn('ml-auto size-1.5 shrink-0 rounded-full', categoryDots[item.href])} />}</Link>
  }
  return <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-3 py-3">
    <div className="flex flex-col gap-1">{navigation.map(renderLink)}</div>
    {!collapsed && <section aria-label="Accesos de pagos" className="mt-7">
      <h2 className="mb-2 px-2 text-xs font-medium text-muted-foreground">Cobranza</h2>
      <div className="ml-2 flex flex-col gap-1 border-l pl-2">
        {renderLink({ label: 'Nuevo cobro', href: '/admin/orders/new', icon: Plus })}
        {renderLink({ label: 'Resumen', href: '/admin/reports', icon: ChartNoAxesCombined })}
        {renderLink({ label: 'Datos de pago', href: '/admin/settings/bank-accounts', icon: CreditCard })}
      </div>
    </section>}
    <Separator className="mt-6 bg-sidebar-border" />
    <details className="group mt-6" open={pathname.startsWith('/admin/settings') || pathname === '/admin/profile' || undefined}>
      <summary title={collapsed?'Ajustes':undefined} className={cn('flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-sidebar-accent focus-visible:outline-2 focus-visible:outline-ring',collapsed&&'justify-center')}><Settings aria-hidden="true" className="size-[18px] shrink-0" /><span className={collapsed?'sr-only':undefined}>Ajustes</span>{!collapsed&&<ChevronDown aria-hidden="true" className="ml-auto size-4 group-open:rotate-180" />}</summary>
      <div className={cn('mt-1 flex flex-col gap-1',!collapsed&&'pl-2')}>{settings.map(renderLink)}</div>
    </details>
  </nav>
}

function Account({ userEmail }: { userEmail: string }) {
  const router = useRouter()
  async function logout() {
    const { createClient } = await import('@/lib/supabase/client')
    await createClient().auth.signOut()
    router.replace('/login')
    router.refresh()
  }
  return <div className="flex items-center gap-2 border-t border-sidebar-border p-4"><Link href="/admin/profile" className="min-w-0 flex-1 rounded-md p-1"><span className="block text-xs font-medium">Mi cuenta</span><span className="mt-1 block truncate text-xs text-muted-foreground">{userEmail}</span></Link><button type="button" onClick={logout} aria-label="Cerrar sesión" className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent"><LogOut className="size-4" /></button></div>
}

export function Sidebar({ userEmail, isPlatformOwner = false }: { userEmail: string; isPlatformOwner?: boolean }) {
  const [collapsed,setCollapsed]=useState(false)
  const pathname = usePathname()
  const ToggleIcon=collapsed?PanelLeftOpen:PanelLeftClose
  return <aside className="otla-navigation flex shrink-0 border-r border-sidebar-border">
    <div className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-sidebar-border bg-white py-3">
      <Link href="/admin" aria-label="OTLA · Inicio" className="mb-2 flex size-10 items-center justify-center rounded-lg"><Image src="/otla-app-icon-v2.png" alt="" width={192} height={192} className="size-9 rounded-lg" priority /></Link>
      <nav aria-label="Accesos principales" className="flex flex-col gap-2">{navigation.map(item => {
        const active = item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href)
        const Icon = item.icon
        return <Link key={item.href} href={item.href} title={item.label} aria-label={item.label} aria-current={active ? 'page' : undefined} className={cn('flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent', active && 'bg-sidebar-accent text-sidebar-accent-foreground')}><Icon aria-hidden="true" className="size-[18px]" /></Link>
      })}</nav>
      <button type="button" onClick={()=>setCollapsed(value=>!value)} aria-label={collapsed?'Expandir menú lateral':'Contraer menú lateral'} title={collapsed?'Expandir menú lateral':'Contraer menú lateral'} aria-expanded={!collapsed} aria-controls="desktop-sidebar-navigation" className="mt-3 flex size-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-sidebar-accent"><ToggleIcon aria-hidden="true" className="size-4" /></button>
      <Link href="/admin/profile" aria-label="Mi cuenta" title={userEmail} className="mt-auto flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground"><Users aria-hidden="true" className="size-4" /></Link>
    </div>
    {!collapsed && <div id="desktop-sidebar-navigation" className="flex w-48 min-w-0 flex-col">
      <Link href="/admin" className="flex min-h-14 items-center justify-between gap-2 px-5 text-sm font-semibold">OTLA<span className="text-xs font-normal text-muted-foreground">Mi espacio</span></Link>
      <Navigation isPlatformOwner={isPlatformOwner} />
      <Account userEmail={userEmail} />
    </div>}
  </aside>
}

export function MobileAdminNav({ userEmail, isPlatformOwner = false }: { userEmail: string; isPlatformOwner?: boolean }) {
  const [open, setOpen] = useState(false)
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger aria-label="Abrir navegación" className="flex size-11 items-center justify-center rounded-lg hover:bg-muted md:hidden"><Menu className="size-5" /></DialogTrigger><DialogContent className="otla-navigation flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0"><div className="p-5"><DialogTitle>Chava Cervantes</DialogTitle><DialogDescription>Mi espacio de trabajo</DialogDescription></div><Navigation onNavigate={() => setOpen(false)} isPlatformOwner={isPlatformOwner} /><Account userEmail={userEmail} /></DialogContent></Dialog>
}
