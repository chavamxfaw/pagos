import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { deleteClient, setClientPortalEnabled } from '@/actions/clients'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button'
import { CopyLinkButton } from '@/components/admin/CopyLinkButton'
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog'
import { formatCurrency, formatDateShort, getProgressPercent, cn } from '@/lib/utils'

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .single()

  if (!client) notFound()

  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .eq('client_id', id)
    .order('created_at', { ascending: false })

  const activeOrders = orders?.filter(o => o.status !== 'completed') ?? []
  const completedOrders = orders?.filter(o => o.status === 'completed') ?? []

  async function deleteClientAction() {
    'use server'
    await deleteClient(id)
    redirect('/admin/clients')
  }

  async function toggleClientPortalAction() {
    'use server'
    await setClientPortalEnabled(id, !client.client_portal_enabled)
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link href="/admin/clients" className="text-zinc-500 hover:text-zinc-300 text-sm transition-colors">
          ← Clientes
        </Link>
      </div>

      {/* Client header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-50">{client.name}</h1>
            {client.company && (
              <p className="text-emerald-400/80 text-sm font-medium mt-0.5">{client.company}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              <p className="text-zinc-400 text-sm">{client.email}</p>
              {client.phone && <p className="text-zinc-500 text-sm">{client.phone}</p>}
            </div>
            {(client.rfc || client.address) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                {client.rfc && <p className="text-zinc-600 text-xs font-mono">RFC: {client.rfc}</p>}
                {client.address && <p className="text-zinc-600 text-xs">{client.address}</p>}
              </div>
            )}
            {client.notes && (
              <p className="text-zinc-500 text-sm mt-3 border-t border-zinc-800 pt-3">{client.notes}</p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <Link
              href={`/admin/clients/${id}/edit`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'border-zinc-700 text-zinc-300 hover:bg-zinc-800')}
            >
              Editar
            </Link>
            <Link
              href={`/admin/orders/new?client=${id}`}
              className={cn(buttonVariants({ size: 'sm' }), 'bg-emerald-500 hover:bg-emerald-400 text-black font-semibold')}
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

      {/* Client public portal */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-zinc-100 font-semibold">Link general del cliente</h2>
              <Badge
                className={
                  client.client_portal_enabled
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }
              >
                {client.client_portal_enabled ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <p className="text-zinc-500 text-sm">
              Muestra todas las órdenes del cliente, saldos pendientes y progreso de pagos.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
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
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50"
              >
                {client.client_portal_enabled ? 'Desactivar link' : 'Activar link'}
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Active orders */}
      {activeOrders.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-zinc-200 mb-3">
            Órdenes activas ({activeOrders.length})
          </h2>
          <div className="space-y-3">
            {activeOrders.map((order) => {
              const percent = getProgressPercent(order.paid_amount, order.total_amount)
              return (
                <Link key={order.id} href={`/admin/orders/${order.id}`} className="block">
                  <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-zinc-100 font-medium">{order.concept}</p>
                      <Badge
                        className={
                          order.status === 'partial'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                        }
                      >
                        {order.status === 'partial' ? 'Parcial' : 'Pendiente'}
                      </Badge>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full mb-2">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="flex justify-between text-xs font-mono text-zinc-500">
                      <span>{formatCurrency(order.paid_amount)} / {formatCurrency(order.total_amount)}</span>
                      <span>{percent}%</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Completed orders */}
      {completedOrders.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-zinc-500 mb-3">
            Órdenes liquidadas ({completedOrders.length})
          </h2>
          <div className="space-y-2">
            {completedOrders.map((order) => (
              <Link key={order.id} href={`/admin/orders/${order.id}`} className="block">
                <div className="bg-zinc-950 border border-zinc-800/50 hover:border-zinc-700 rounded-xl p-4 transition-colors">
                  <div className="flex justify-between items-center">
                    <p className="text-zinc-400">{order.concept}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-zinc-500 text-sm font-mono">{formatCurrency(order.total_amount)}</span>
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                        Liquidado
                      </Badge>
                    </div>
                  </div>
                  <p className="text-zinc-600 text-xs mt-1">{formatDateShort(order.created_at)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {!orders?.length && (
        <div className="text-center py-16 text-zinc-600">
          <p className="mb-2">Sin órdenes aún</p>
          <Link href={`/admin/orders/new?client=${id}`} className="text-emerald-400 hover:text-emerald-300 text-sm">
            Crear primera orden →
          </Link>
        </div>
      )}
    </div>
  )
}
