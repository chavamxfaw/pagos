import Link from 'next/link'
import { ArrowUpRight, CalendarDays, CheckCheck, MessageCircle, Plus, WalletCards } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { getDisplayName } from '@/lib/user-settings'
import { cn, formatCurrency, formatDateShort, getOrderTiming } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import type { OrderWithClient } from '@/types'

type Booking = { id: string; guest_name: string; starts_at: string; status: string }
type Task = { id: string; title: string; due_date: string | null; status: string }
type Followup = { id: string; client_id: string; content: string; follow_up_date: string }

function Unavailable({ area, optional = false }: { area: string; optional?: boolean }) {
  return <div role="status" className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-sm"><p className="font-medium">{area} no disponible</p><p className="mt-1 text-muted-foreground">{optional ? 'Este módulo requiere activar su configuración de datos o recuperar la conexión.' : 'No pudimos consultar los datos. Los importes no se muestran para evitar información incompleta.'}</p><Link href="/admin" className="mt-3 inline-flex min-h-9 items-center text-primary">Reintentar</Link></div>
}
function Section({ title, href, label, children }: { title: string; href: string; label: string; children: React.ReactNode }) {
  const Icon=href==='/admin/calendar'?CalendarDays:href==='/admin/crm/tasks'?CheckCheck:href==='/admin/orders'?WalletCards:MessageCircle
  const tint=href==='/admin/orders'?'bg-amber-50 text-amber-700':href==='/admin/clients'?'bg-emerald-50 text-emerald-700':'bg-secondary text-primary'
  return <section className="rounded-xl border border-border bg-card p-4 sm:p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="flex items-center gap-2.5 text-sm font-semibold tracking-tight"><span className={cn('flex size-8 items-center justify-center rounded-lg',tint)}><Icon className="size-4" aria-hidden="true" /></span>{title}</h2><Link href={href} className="inline-flex min-h-10 items-center gap-1 text-xs font-medium text-primary">{label}<ArrowUpRight className="size-3.5" /></Link></div>{children}</section>
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg bg-muted/60 p-4 text-sm leading-relaxed text-muted-foreground">{children}</p>
}

export default async function TodayPage() {
  const user = await requireAdmin()
  const supabase = await createClient()
  const now = new Date()
  const [name, ordersResult, bookingsResult, tasksResult, followupsResult] = await Promise.all([
    getDisplayName(user.id, user.email ?? ''),
    supabase.from('orders').select('*, clients(*)').not('status', 'in', '(completed,cancelled)').order('created_at', { ascending: false }).limit(1000),
    supabase.from('calendar_bookings').select('id,guest_name,starts_at,status').eq('owner_user_id', user.id).gte('starts_at', now.toISOString()).neq('status', 'cancelled').order('starts_at').limit(4),
    supabase.from('crm_tasks').select('id,title,due_date,status').eq('owner_user_id', user.id).neq('status', 'completed').order('due_date', { nullsFirst: false }).limit(5),
    supabase.from('client_followups').select('id,client_id,content,follow_up_date').not('follow_up_date', 'is', null).order('follow_up_date', { ascending: false }).limit(4),
  ])
  const orders = (ordersResult.data ?? []) as OrderWithClient[]
  const urgent = orders.filter(order => ['overdue', 'due_today', 'due_soon'].includes(getOrderTiming(order).key)).sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')).slice(0, 5)
  const pending = orders.reduce((sum, order) => sum + Math.max(0, Number(order.total_amount) - Number(order.paid_amount)), 0)
  const bookings = (bookingsResult.data ?? []) as Booking[]
  const tasks = (tasksResult.data ?? []) as Task[]
  const followups = (followupsResult.data ?? []) as Followup[]
  const day = new Intl.DateTimeFormat('es-MX', { dateStyle: 'full', timeZone: 'America/Monterrey' }).format(now)

  return <div className="mx-auto max-w-6xl space-y-9 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="text-sm capitalize text-muted-foreground">{day}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Hoy</h1><p className="mt-2 text-sm text-muted-foreground">Hola, {name}. Este es tu espacio para avanzar.</p></div>
      <Link href="/admin/clients/new" className={cn(buttonVariants(), 'min-h-11 w-fit gap-2')}><Plus className="size-4" />Nuevo contacto</Link>
    </header>
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-xl border border-primary/10 bg-secondary/50 px-5 py-5">
      {ordersResult.error ? <p role="status" className="text-sm text-amber-800">No se pudo consultar el resumen de pagos.</p> : <><div><span className="text-sm text-muted-foreground">Por cobrar</span><strong className="ml-3 font-semibold tabular-nums">{formatCurrency(pending)}</strong>{orders.length >= 1000 && <span className="ml-2 text-xs text-amber-800">Primeras 1,000 órdenes</span>}</div><div className="text-sm"><strong className="font-semibold">{orders.length}</strong><span className="ml-2 text-muted-foreground">órdenes activas</span></div></>}
      <Link href="/admin/reports" className="ml-auto text-sm text-primary">Resumen financiero →</Link>
    </div>
    <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-5">
        <Section title="Próximas reuniones" href="/admin/calendar" label="Abrir agenda">
          {bookingsResult.error ? <Unavailable area="Agenda" optional /> : bookings.length ? <div className="divide-y">{bookings.map(booking => <Link key={booking.id} href="/admin/calendar" className="flex items-start gap-4 rounded-md py-4 hover:bg-muted/50"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted"><CalendarDays className="size-4 text-muted-foreground" /></span><div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{booking.guest_name}</p><p className="mt-1 text-xs text-muted-foreground">{new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Monterrey' }).format(new Date(booking.starts_at))} · Monterrey</p><p className="mt-1 text-xs text-muted-foreground">{booking.status === 'confirmed' ? 'Confirmada' : booking.status === 'sync_failed' ? 'Revisar sincronización' : 'Pendiente de confirmación'}</p></div><ArrowUpRight className="size-4 text-muted-foreground" /></Link>)}</div> : <Empty>No hay próximas reservas registradas. Abre Agenda para revisar tus calendarios y enlaces.</Empty>}
        </Section>
        <Section title="Tu siguiente paso" href="/admin/crm/tasks" label="Ver tareas">
          {tasksResult.error ? <Unavailable area="Tareas" optional /> : tasks.length ? <div className="divide-y">{tasks.map(task => <Link key={task.id} href="/admin/crm/tasks" className="flex items-start gap-3 rounded-md py-4 hover:bg-muted/50"><span className="mt-0.5 size-4 shrink-0 rounded-full border" /><div><p className="text-sm font-medium">{task.title}</p><p className="mt-1 text-xs text-muted-foreground">{task.due_date ? formatDateShort(task.due_date) : 'Sin fecha límite'}</p></div></Link>)}</div> : <Empty>No hay tareas pendientes. Crea tu siguiente acción desde Tareas.</Empty>}
        </Section>
      </div>
      <div className="space-y-5">
        <Section title="Cobros que requieren atención" href="/admin/orders" label="Ver pagos">
          {ordersResult.error ? <Unavailable area="Pagos" /> : urgent.length ? <div className="divide-y">{urgent.map(order => <Link key={order.id} href={'/admin/orders/' + order.id} className="flex items-center justify-between gap-4 rounded-md py-4 hover:bg-muted/50"><div className="min-w-0"><p className="truncate text-sm font-medium">{order.clients?.name ?? 'Contacto'}</p><p className="mt-1 text-xs text-muted-foreground">{order.due_date ? formatDateShort(order.due_date) : 'Sin vencimiento'} · {getOrderTiming(order).key === 'overdue' ? 'Vencida' : 'Próxima a vencer'}</p></div><span className="shrink-0 text-sm font-medium tabular-nums">{formatCurrency(Math.max(0, Number(order.total_amount) - Number(order.paid_amount)))}</span></Link>)}</div> : <Empty>No hay órdenes vencidas o próximas a vencer entre las órdenes consultadas.</Empty>}
        </Section>
        <Section title="Seguimientos registrados" href="/admin/clients" label="Ver contactos">
          {followupsResult.error ? <Unavailable area="Seguimientos" /> : followups.length ? <div className="divide-y">{followups.map(item => <Link key={item.id} href={'/admin/clients/' + item.client_id} className="block rounded-md py-4 hover:bg-muted/50"><p className="line-clamp-2 text-sm leading-relaxed">{item.content}</p><p className="mt-2 text-xs text-muted-foreground">{formatDateShort(item.follow_up_date)}</p></Link>)}</div> : <Empty>Los seguimientos de tus contactos aparecerán aquí cuando tengan una fecha.</Empty>}
        </Section>
      </div>
    </div>
    <footer className="flex flex-wrap gap-3 border-t pt-5 text-sm"><Link href="/admin/crm/opportunities" className="rounded-lg bg-muted px-4 py-3 hover:bg-accent">Revisar ventas</Link><Link href="/admin/messages" className="rounded-lg bg-muted px-4 py-3 hover:bg-accent">Comunicación por WhatsApp</Link><Link href="/admin/orders/new" className="rounded-lg bg-muted px-4 py-3 hover:bg-accent">Crear orden de pago</Link></footer>
  </div>
}
