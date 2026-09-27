'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { CalendarDays, ChartNoAxesCombined, ChevronDown, CreditCard, FileText, Folder, Home, LogOut, Menu, MessageCircle, PanelLeftClose, PanelLeftOpen, Settings, Users, WalletCards } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const navigation = [
  { label: 'Hoy', href: '/admin', icon: Home },
  { label: 'Contactos', href: '/admin/clients', icon: Users },
  { label: 'Ventas', href: '/admin/crm/opportunities', icon: ChartNoAxesCombined },
  { label: 'Proyectos', href: '/admin/crm/projects', icon: Folder },
  { label: 'Agenda', href: '/admin/calendar', icon: CalendarDays },
  { label: 'Pagos', href: '/admin/orders', icon: WalletCards },
  { label: 'Comunicación', href: '/admin/messages', icon: MessageCircle },
]
const settings = [
  { label: 'Datos bancarios', href: '/admin/settings/bank-accounts', icon: CreditCard },
  { label: 'Documentos fiscales', href: '/admin/settings/fiscal-documents', icon: FileText },
  { label: 'Stripe', href: '/admin/settings/stripe', icon: WalletCards },
  { label: 'Mi perfil', href: '/admin/profile', icon: Settings },
]

function Navigation({ onNavigate, isPlatformOwner = false, collapsed = false }: { onNavigate?: () => void; isPlatformOwner?: boolean; collapsed?: boolean }) {
  const pathname = usePathname()
  function renderLink(item: typeof navigation[number]) {
    const active = item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href)
    const Icon = item.icon
    return <Link key={item.href} href={item.href} onClick={onNavigate} title={collapsed ? item.label : undefined} aria-current={active ? 'page' : undefined} className={cn('flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary', collapsed && 'justify-center', active ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground ring-1 ring-primary/10' : 'text-muted-foreground hover:bg-white/80 hover:text-foreground')}><Icon aria-hidden="true" className="size-[18px] shrink-0" /><span className={collapsed ? 'sr-only' : undefined}>{item.label}</span></Link>
  }
  return <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-3 py-5">
    <div className="space-y-1">{navigation.map(renderLink)}</div>
    <div className="mt-4 space-y-1 border-t pt-3">{renderLink({label:'Propuestas',href:'/admin/crm/proposals',icon:FileText})}{renderLink({label:'Renovaciones',href:'/admin/crm/renewals',icon:CalendarDays})}{isPlatformOwner && renderLink({label:'Plataforma',href:'/admin/platform',icon:Users})}</div>
    <details className="group mt-6" open={pathname.startsWith('/admin/settings') || pathname === '/admin/profile' || undefined}>
      <summary title={collapsed?'Ajustes':undefined} className={cn('flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-black/4 focus-visible:outline-2 focus-visible:outline-primary',collapsed&&'justify-center')}><Settings aria-hidden="true" className="size-[18px] shrink-0" /><span className={collapsed?'sr-only':undefined}>Ajustes</span>{!collapsed&&<ChevronDown aria-hidden="true" className="ml-auto size-4 group-open:rotate-180" />}</summary>
      <div className={cn('mt-1 space-y-1',!collapsed&&'pl-2')}>{settings.map(renderLink)}</div>
    </details>
  </nav>
}

function Identity() {
  return <Link href="/admin" className="flex min-h-20 min-w-0 flex-1 items-center gap-2 pl-3"><Image src="/otla-logo-v2.png" alt="OTLA" width={1408} height={1117} className="h-auto w-16 shrink-0 rounded-md" priority /><span className="min-w-0"><span className="block truncate text-sm font-semibold tracking-tight">Mi espacio</span><span className="block truncate text-xs text-muted-foreground">Chava Cervantes</span></span></Link>
}

function Account({ userEmail }: { userEmail: string }) {
  const router = useRouter()
  async function logout() {
    const { createClient } = await import('@/lib/supabase/client')
    await createClient().auth.signOut()
    router.replace('/login')
    router.refresh()
  }
  return <div className="flex items-center gap-2 border-t p-4"><Link href="/admin/profile" className="min-w-0 flex-1 rounded-md p-1"><span className="block text-xs font-medium">Mi cuenta</span><span className="block truncate text-xs text-muted-foreground">{userEmail}</span></Link><button type="button" onClick={logout} aria-label="Cerrar sesión" className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-black/5"><LogOut className="size-4" /></button></div>
}

export function Sidebar({ userEmail, isPlatformOwner = false }: { userEmail: string; isPlatformOwner?: boolean }) {
  const [collapsed,setCollapsed]=useState(false)
  const ToggleIcon=collapsed?PanelLeftOpen:PanelLeftClose
  return <aside className={cn('flex shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 motion-reduce:transition-none',collapsed?'w-[72px]':'w-64')}>
    <div className={cn('flex min-h-20 items-center',collapsed?'justify-center px-3':'gap-1 pr-2')}>
      {!collapsed&&<Identity />}
      <button type="button" onClick={()=>setCollapsed(value=>!value)} aria-label={collapsed?'Expandir menú lateral':'Contraer menú lateral'} title={collapsed?'Expandir menú lateral':'Contraer menú lateral'} aria-expanded={!collapsed} aria-controls="desktop-sidebar-navigation" className="flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"><ToggleIcon aria-hidden="true" className="size-5" /></button>
    </div>
    <div id="desktop-sidebar-navigation" className="flex min-h-0 flex-1 flex-col"><Navigation isPlatformOwner={isPlatformOwner} collapsed={collapsed} /></div>
    {collapsed?<Link href="/admin/profile" aria-label="Mi cuenta" title={userEmail} className="mx-3 mb-4 flex min-h-11 items-center justify-center rounded-lg border-t text-muted-foreground hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-primary"><Users aria-hidden="true" className="size-[18px]" /></Link>:<Account userEmail={userEmail} />}
  </aside>
}

export function MobileAdminNav({ userEmail, isPlatformOwner = false }: { userEmail: string; isPlatformOwner?: boolean }) {
  const [open, setOpen] = useState(false)
  return <Dialog open={open} onOpenChange={setOpen}><DialogTrigger aria-label="Abrir navegación" className="flex size-11 items-center justify-center rounded-lg hover:bg-muted md:hidden"><Menu className="size-5" /></DialogTrigger><DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden bg-[#f5f5f7] p-0"><div className="p-5"><DialogTitle>Chava Cervantes</DialogTitle><DialogDescription>Mi espacio de trabajo</DialogDescription></div><Navigation onNavigate={() => setOpen(false)} isPlatformOwner={isPlatformOwner} /><Account userEmail={userEmail} /></DialogContent></Dialog>
}
