import Link from 'next/link'
import { ArrowUpRight, CalendarDays, Plus, UserPlus, MessageCircle, Link2, Clock3 } from 'lucide-react'
import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { getDisplayName } from '@/lib/user-settings'
import { cn, formatCurrency, formatDateShort, getOrderTiming, getTodayDateString } from '@/lib/utils'
import { reminderDate } from '@/lib/reminder-preview'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { OrderWithClient } from '@/types'
import { DashboardWorkspace } from '@/components/admin/DashboardWorkspace'
import { DashboardPayments } from '@/components/admin/DashboardPayments'

type Booking = { id: string; guest_name: string; starts_at: string; status: string }
type Followup = { id: string; client_id: string; content: string; follow_up_date: string }

function Unavailable({ area, optional = false }: { area: string; optional?: boolean }) {
  return <div role="status" className="rounded-lg border border-amber-200 bg-amber-50/50 p-4 text-sm"><p className="font-medium">{area} no disponible</p><p className="mt-1 text-muted-foreground">{optional ? 'Este módulo requiere activar su configuración de datos o recuperar la conexión.' : 'No pudimos consultar los datos. Los importes no se muestran para evitar información incompleta.'}</p><Link href="/admin" className="mt-3 inline-flex min-h-9 items-center text-primary">Reintentar</Link></div>
}
function Section({ title, href, label, children }: { title: string; href: string; label: string; children: React.ReactNode }) {
  return <section className="min-w-0"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="text-base font-semibold tracking-tight">{title}</h2><Link href={href} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'gap-1')}>{label}<ArrowUpRight data-icon="inline-end" /></Link></div><Separator />{children}</section>
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-sm leading-relaxed text-muted-foreground">{children}</p>
}

export default async function TodayPage() {
  const user = await requireAdmin()
  const supabase = await createClient()
  const now = new Date()
  const [name, ordersResult, bookingsResult, followupsResult] = await Promise.all([
    getDisplayName(user.id, user.email ?? ''),
    supabase.from('orders').select('*, clients(*)').not('status', 'in', '(completed,cancelled)').order('created_at', { ascending: false }).limit(1000),
    supabase.from('calendar_bookings').select('id,guest_name,starts_at,status').eq('owner_user_id', user.id).gte('starts_at', now.toISOString()).neq('status', 'cancelled').order('starts_at').limit(4),
    supabase.from('client_followups').select('id,client_id,content,follow_up_date').not('follow_up_date', 'is', null).order('follow_up_date', { ascending: false }).limit(4),
  ])
  const orders = (ordersResult.data ?? []) as OrderWithClient[]
  const urgent = orders.filter(order => ['overdue', 'due_today', 'due_soon'].includes(getOrderTiming(order).key)).sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? '')).slice(0, 5)
  const pending = orders.reduce((sum, order) => sum + Math.max(0, Number(order.total_amount) - Number(order.paid_amount)), 0)
  const bookings = (bookingsResult.data ?? []) as Booking[]
  const today = getTodayDateString()
  const reminders = orders
    .filter(order => order.payment_reminder_enabled && Number(order.total_amount) > Number(order.paid_amount))
    .map(order => ({ order, date: reminderDate(order.due_date ?? '', order.payment_reminder_days_before ?? 1) }))
    .filter(item => item.date && item.date >= today && item.order.payment_reminder_last_sent_on !== today)
    .sort((a, b) => a.date!.localeCompare(b.date!)).slice(0, 5)
  const followups = (followupsResult.data ?? []) as Followup[]
  const day = new Intl.DateTimeFormat('es-MX', { dateStyle: 'full', timeZone: 'America/Monterrey' }).format(now)

  const activity = <Section title="Seguimientos registrados" href="/admin/clients" label="Contactos">
    <p className="mt-4 text-xs leading-5 text-muted-foreground">Seguimientos con fecha de tus contactos. No representa un historial de mensajes enviados.</p>
    {followupsResult.error ? <Unavailable area="Seguimientos" /> : followups.length ? <div className="divide-y">{followups.map(item => <Link key={item.id} href={'/admin/clients/' + item.client_id} className="block rounded-md py-4 hover:bg-muted/50"><p className="line-clamp-3 text-sm leading-relaxed">{item.content}</p><p className="mt-2 text-xs text-muted-foreground">{formatDateShort(item.follow_up_date)}</p></Link>)}</div> : <Empty>Aún no hay seguimientos con fecha. Puedes añadirlos desde la ficha de un contacto.</Empty>}
  </Section>
  const summary = <>
    <Section title="Próximas citas" href="/admin/calendar" label="Agenda">
      {bookingsResult.error ? <Unavailable area="Agenda" optional /> : bookings.length ? <div className="divide-y">{bookings.map(booking => <Link key={booking.id} href="/admin/calendar" className="flex items-start gap-3 py-4"><CalendarDays className="mt-1 size-4 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="break-words text-sm font-medium">{booking.guest_name}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Monterrey' }).format(new Date(booking.starts_at))} · Monterrey</p><Badge variant="outline" className="mt-2">{booking.status === 'confirmed' ? 'Confirmada' : booking.status === 'sync_failed' ? 'Revisar sincronización' : 'Pendiente'}</Badge></div></Link>)}</div> : <Empty>No hay próximas citas registradas.</Empty>}
    </Section>
    <Section title="Recordatorios" href="/admin/orders" label="Configurar">
      {ordersResult.error ? <Unavailable area="Recordatorios" /> : reminders.length ? <div className="divide-y">{reminders.map(({ order, date }) => <Link key={order.id} href={`/admin/orders/${order.id}/edit`} className="block py-4"><p className="truncate text-sm font-medium">{order.clients?.name ?? 'Contacto'}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateShort(date!)} · {[order.notify_whatsapp_enabled !== false && 'WhatsApp', order.notify_email_enabled !== false && 'Correo'].filter(Boolean).join(' · ') || 'Sin canal activo'}</p></Link>)}<p className="text-xs leading-5 text-muted-foreground">Fechas configuradas; no confirmaciones de envío.</p></div> : <Empty>No hay próximos avisos. Configura el recordatorio al editar un cobro.</Empty>}
    </Section>
    <div className="rounded-xl bg-secondary p-4"><h2 className="text-sm font-medium text-secondary-foreground">Cada cobro, a tu ritmo</h2><p className="mt-2 text-xs leading-5 text-secondary-foreground">Elige cuántos días antes del vencimiento quieres recordar un pago.</p><Link href="/admin/orders" className={cn(buttonVariants({ variant: 'link', size: 'sm' }), 'mt-2')}>Revisar mis cobros<ArrowUpRight data-icon="inline-end" /></Link></div>
  </>
  return <DashboardWorkspace summary={summary} activity={activity}><div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6">
    <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div><h1 className="text-xl font-semibold tracking-tight">Tus cobros</h1><p className="mt-1 text-xs text-muted-foreground">{name} · {day}</p></div>
      <Link href="/admin/orders/new" className={cn(buttonVariants(), 'min-h-11 w-fit gap-2')}><Plus data-icon="inline-start" />Nuevo cobro</Link>
    </header>
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg bg-muted/60 px-4 py-3">
      {ordersResult.error ? <p role="status" className="text-sm text-amber-800">No se pudo consultar el resumen de pagos.</p> : <><div><span className="text-sm text-muted-foreground">Por cobrar</span><strong className="ml-3 font-semibold tabular-nums">{formatCurrency(pending)}</strong>{orders.length >= 1000 && <span className="ml-2 text-xs text-amber-800">Primeras 1,000 órdenes</span>}</div><div className="text-sm"><strong className="font-semibold">{orders.length}</strong><span className="ml-2 text-muted-foreground">órdenes activas</span></div></>}
      {!ordersResult.error && <Badge variant="secondary"><Clock3 data-icon="inline-start" />{urgent.length === 5 ? '5 o más' : urgent.length} {urgent.length === 1 ? 'cobro' : 'cobros'} por revisar</Badge>}
      <Link href="/admin/reports" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'sm:ml-auto')}>Resumen financiero<ArrowUpRight data-icon="inline-end" /></Link>
    </div>
    <nav aria-label="Acciones rápidas" className="flex flex-wrap gap-2"><Link href="/admin/clients/new" className={buttonVariants({ variant: 'outline' })}><UserPlus data-icon="inline-start" />Nuevo contacto</Link><Link href="/admin/messages" className={buttonVariants({ variant: 'outline' })}><MessageCircle data-icon="inline-start" />Abrir comunicación</Link><Link href="/admin/calendar" className={buttonVariants({ variant: 'outline' })}><Link2 data-icon="inline-start" />Enlaces de reserva</Link></nav>
    <div className="flex min-w-0 flex-col gap-8">
        <Section title="Listado de cobros" href="/admin/orders" label="Ver pagos">
          {ordersResult.error ? <Unavailable area="Pagos" /> : <DashboardPayments payments={orders.map(order => ({ id: order.id, client: order.clients?.name ?? 'Contacto', concept: order.concept, due: order.due_date ?? null, balance: Math.max(0, Number(order.total_amount) - Number(order.paid_amount)), timing: getOrderTiming(order).key }))} />}
        </Section>
    </div>
  </div></DashboardWorkspace>
}
