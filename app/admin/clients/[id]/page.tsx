import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/admin'
import { deleteClient, setClientPortalEnabled } from '@/actions/clients'
import { addClientFollowup } from '@/actions/followups'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
import { CopyLinkButton } from '@/components/admin/CopyLinkButton'
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog'
import { ClientFollowups } from '@/components/admin/ClientFollowups'
import { ClientOrderReorderList } from '@/components/admin/ClientOrderReorderList'
import { formatCurrency, formatDateShort, getProgressPercent, cn } from '@/lib/utils'
import type { ActivityLog, ClientFollowup } from '@/types'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireAdmin()
  const supabase = await createClient()

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (clientError && clientError.code !== 'PGRST116') throw new Error('No se pudo consultar el contacto. Inténtalo de nuevo.')
  if (!client) notFound()

  const { data: orders, error: ordersError } = await supabase
    .from('orders')
    .select('*')
    .eq('client_id', id)
    .order('public_sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  const [{ data: followups, error: followupsError }, { data: activityLogs, error: activityError }] = await Promise.all([
    supabase
      .from('client_followups')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .limit(8),
    supabase
      .from('activity_logs')
      .select('*')
      .eq('client_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (ordersError || followupsError || activityError) throw new Error('No se pudo cargar el historial completo del contacto. Inténtalo de nuevo.')
  const { data: bookings, error: bookingsError } = await supabase.from('calendar_bookings').select('id,guest_name,starts_at,status').eq('client_id', id).eq('owner_user_id', user.id).order('starts_at', { ascending: false }).limit(20)
  const activeOrders = orders?.filter(o => !['completed', 'cancelled'].includes(o.status)) ?? []
  const completedOrders = orders?.filter(o => o.status === 'completed') ?? []
  const totalOrders = orders ?? []
  const totalAmount = totalOrders.reduce((sum, order) => sum + order.total_amount, 0)
  const paidAmount = totalOrders.reduce((sum, order) => sum + order.paid_amount, 0)
  const pendingAmount = Math.max(totalAmount - paidAmount, 0)
  const globalProgress = getProgressPercent(paidAmount, totalAmount)

  async function deleteClientAction() {
    'use server'
    await deleteClient(id)
    redirect('/admin/clients')
  }

  async function toggleClientPortalAction() {
    'use server'
    await setClientPortalEnabled(id, !client.client_portal_enabled)
  }

  async function addFollowupAction(prevState: { error?: string; success?: boolean } | null, formData: FormData) {
    'use server'
    try {
      await addClientFollowup({
        client_id: id,
        note_type: formData.get('note_type') as ClientFollowup['note_type'],
        content: formData.get('content') as string,
        follow_up_date: (formData.get('follow_up_date') as string) || undefined,
      })
      return { success: true }
    } catch (e: unknown) {
      return { error: e instanceof Error ? e.message : 'Error al agregar seguimiento' }
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <div className="mb-6">
        <Link href="/admin/clients" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
          ← Contactos
        </Link>
      </div>

      {/* Client header */}
      <div className="mb-6 rounded-xl border border-[#E6EAF0] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-foreground">{client.name}</h1>
            {client.company && (
              <p className="text-[#2ED39A]/80 text-sm font-medium mt-0.5">{client.company}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              <p className="text-muted-foreground text-sm">{client.email ?? 'Sin correo registrado'}</p>
              {client.phone && <p className="text-muted-foreground text-sm">{client.phone}</p>}
            </div>
            {(client.rfc || client.address) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                {client.rfc && <p className="text-[#8A94A6] text-xs font-mono">RFC: {client.rfc}</p>}
                {client.address && <p className="text-[#8A94A6] text-xs">{client.address}</p>}
              </div>
            )}
            {client.notes && (
              <p className="text-muted-foreground text-sm mt-3 border-t border-[#E6EAF0] pt-3">{client.notes}</p>
            )}
          </div>
          <div className="grid w-full grid-cols-1 gap-2 min-[430px]:grid-cols-3 sm:w-auto sm:grid-cols-none sm:flex sm:shrink-0">
            <Link
              href={`/admin/clients/${id}/edit`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full justify-center border-[#D8DEE8] text-foreground hover:bg-[#E6EAF0] sm:w-auto')}
            >
              Editar
            </Link>
            <Link
              href={`/admin/orders/new?client=${id}`}
              className={cn(buttonVariants({ size: 'sm' }), 'w-full justify-center font-medium sm:w-auto')}
            >
              + Nueva orden
            </Link>
            <DeleteConfirmDialog
              action={deleteClientAction}
              title="Borrar cliente"
              description="Esto eliminará el cliente y también sus órdenes y abonos asociados. Esta acción no se puede deshacer."
              confirmLabel="Borrar cliente"
              triggerLabel="Borrar"
            />
          </div>
        </div>
      </div>

      <nav aria-label="Acciones del contacto" className="mb-6 flex flex-wrap gap-2 border-y py-3 text-sm">
        <Link href={`/admin/messages?client=${id}`} className="rounded-lg px-3 py-2 text-primary hover:bg-muted">WhatsApp y documentos</Link>
        <Link href={`/admin/crm/opportunities?client=${id}`} className="rounded-lg px-3 py-2 text-primary hover:bg-muted">Ventas</Link>
        <Link href={`/admin/crm/projects?client=${id}`} className="rounded-lg px-3 py-2 text-primary hover:bg-muted">Proyectos</Link>
        <Link href="/admin/calendar" className="rounded-lg px-3 py-2 text-primary hover:bg-muted">Agenda y enlaces</Link>
      </nav>

      <section className="mb-6 rounded-xl border p-5">
        <div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-semibold">Historial de citas</h2><Link href="/admin/calendar" className="text-sm text-primary">Abrir agenda →</Link></div>
        <p className="mb-3 text-xs text-muted-foreground">Asociación por correo declarado: la identidad de quien reserva no está verificada.</p>
        {bookingsError ? <p role="status" className="text-sm text-muted-foreground">No se pudieron consultar las citas. La agenda puede requerir configuración o volver a conectarse.</p> : bookings?.length ? <div className="divide-y">{bookings.map(booking => <div key={booking.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Monterrey' }).format(new Date(booking.starts_at))}<span className="ml-1 text-xs text-muted-foreground">Monterrey</span></span><span className="text-muted-foreground">{booking.status === 'confirmed' ? 'Confirmada' : booking.status === 'cancelled' ? 'Cancelada' : 'Pendiente de sincronización'}</span></div>)}</div> : <p className="py-3 text-sm text-muted-foreground">Aún no hay citas registradas para este contacto.</p>}
      </section>

      {/* Client financial summary */}
      <div className="mb-6 rounded-xl border border-[#E3E8F0] bg-white/90 p-5 shadow-[0_10px_30px_rgba(26,31,54,0.025)]">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Resumen financiero</p>
            <h2 className="mt-1 text-xl font-semibold text-foreground">Estado global del cliente</h2>
          </div>
          <div className="rounded-full bg-[#F8FAFF] px-3 py-1 text-sm font-semibold text-muted-foreground ring-1 ring-[#E6EAF0]">
            {globalProgress}% pagado
          </div>
        </div>

        <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryMetric label="Total en órdenes" value={formatCurrency(totalAmount)} />
          <SummaryMetric label="Pagado" value={formatCurrency(paidAmount)} tone="paid" />
          <SummaryMetric label="Pendiente" value={formatCurrency(pendingAmount)} tone="pending" />
          <SummaryMetric label="Órdenes" value={`${totalOrders.length}`} detail={`${activeOrders.length} activas · ${completedOrders.length} liquidadas`} />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Progreso global</span>
            <span>{globalProgress}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[#E6EAF0]">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 motion-reduce:transition-none"
              style={{ width: `${globalProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Client public portal */}
      <div className="bg-white border border-[#E6EAF0] rounded-xl p-5 mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-foreground font-semibold">Link general del cliente</h2>
              <Badge
                className={
                  client.client_portal_enabled
                    ? 'bg-[#2ED39A]/10 text-[#2ED39A] border-[#2ED39A]/30'
                    : 'bg-[#E6EAF0] text-muted-foreground border-[#D8DEE8]'
                }
              >
                {client.client_portal_enabled ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">Órdenes, saldos y progreso.</p>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 min-[430px]:grid-cols-2 sm:w-auto sm:flex sm:flex-wrap">
            {client.client_portal_enabled && (
              <CopyLinkButton
                path={`/c/${client.client_portal_token}`}
                label="Copiar link general"
              />
            )}
            <form action={toggleClientPortalAction}>
              <Button
                type="submit"
                variant="outline"
                className="w-full justify-center border-[#D8DEE8] text-foreground hover:bg-[#E6EAF0] hover:text-foreground sm:w-auto"
              >
                {client.client_portal_enabled ? 'Desactivar link' : 'Activar link'}
              </Button>
            </form>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <ClientFollowups
          followups={(followups ?? []) as ClientFollowup[]}
          action={addFollowupAction}
        />
        <ActivityPanel activityLogs={(activityLogs ?? []) as ActivityLog[]} />
      </div>

      {/* Active orders */}
      {activeOrders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-3">
            Órdenes activas ({activeOrders.length})
          </h2>
          <ClientOrderReorderList clientId={id} orders={activeOrders} />
        </div>
      )}

      {/* Completed orders */}
      {completedOrders.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-muted-foreground mb-3">
            Órdenes liquidadas ({completedOrders.length})
          </h2>
          <div className="space-y-2">
            {completedOrders.map((order) => (
              <Link key={order.id} href={`/admin/orders/${order.id}`} className="block">
                <div className="bg-white border border-[#E6EAF0] hover:border-[#D8DEE8] rounded-xl p-4 transition-colors">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-muted-foreground">{order.concept}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-muted-foreground text-sm font-mono">{formatCurrency(order.total_amount)}</span>
                      <Badge className="bg-[#2ED39A]/10 text-[#2ED39A] border-[#2ED39A]/30">
                        Liquidado
                      </Badge>
                    </div>
                  </div>
                  <p className="text-[#8A94A6] text-xs mt-1">{formatDateShort(order.created_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!orders?.length && (
        <div className="text-center py-16 text-[#8A94A6]">
          <p className="mb-2">Sin órdenes aún</p>
          <Link href={`/admin/orders/new?client=${id}`} className="text-[#2ED39A] hover:text-[#26BA88] text-sm">
            Crear primera orden →
          </Link>
        </div>
      )}
    </div>
  )
}

function ActivityPanel({ activityLogs }: { activityLogs: ActivityLog[] }) {
  return (
    <div className="rounded-xl border border-[#E3E8F0] bg-white/90 p-5 shadow-[0_10px_30px_rgba(26,31,54,0.025)]">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Bitácora</p>
        <h2 className="mt-1 text-xl font-semibold text-foreground">Actividad reciente</h2>
      </div>
      {!activityLogs.length ? (
        <p className="text-sm text-[#8A94A6]">Sin actividad registrada todavía.</p>
      ) : (
        <div className="space-y-3">
          {activityLogs.map((log) => (
            <div key={log.id} className="border-l-2 border-[#E6EAF0] pl-3">
              <p className="text-sm font-medium text-foreground">{log.message}</p>
              <p className="mt-0.5 text-xs text-[#8A94A6]">{formatDateShort(log.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryMetric({
  label,
  value,
  detail,
  tone,
}: {
  label: string
  value: string
  detail?: string
  tone?: 'paid' | 'pending'
}) {
  return (
    <div className="rounded-xl border border-[#E6EAF0] bg-[#F8FAFF] p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          'font-mono text-lg font-semibold text-foreground',
          tone === 'paid' && 'text-[#2ED39A]',
          tone === 'pending' && 'text-[#F4B740]'
        )}
      >
        {value}
      </p>
      {detail && <p className="mt-1 text-xs text-[#8A94A6]">{detail}</p>}
    </div>
  )
}
