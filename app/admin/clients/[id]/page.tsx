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
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <div className="mb-6">
        <Link href="/admin/clients" className="text-[#6B7280] hover:text-[#1A1F36] text-sm transition-colors">
          ← Clientes
        </Link>
      </div>

      {/* Client header */}
      <div className="mb-6 rounded-xl border border-[#E6EAF0] bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[#1A1F36]">{client.name}</h1>
            {client.company && (
              <p className="text-[#2ED39A]/80 text-sm font-medium mt-0.5">{client.company}</p>
            )}
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
              <p className="text-[#6B7280] text-sm">{client.email ?? 'Sin correo registrado'}</p>
              {client.phone && <p className="text-[#6B7280] text-sm">{client.phone}</p>}
            </div>
            {(client.rfc || client.address) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                {client.rfc && <p className="text-[#8A94A6] text-xs font-mono">RFC: {client.rfc}</p>}
                {client.address && <p className="text-[#8A94A6] text-xs">{client.address}</p>}
              </div>
            )}
            {client.notes && (
              <p className="text-[#6B7280] text-sm mt-3 border-t border-[#E6EAF0] pt-3">{client.notes}</p>
            )}
          </div>
          <div className="grid w-full grid-cols-1 gap-2 min-[430px]:grid-cols-3 sm:w-auto sm:grid-cols-none sm:flex sm:shrink-0">
            <Link
              href={`/admin/clients/${id}/edit`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'w-full justify-center border-[#D8DEE8] text-[#1A1F36] hover:bg-[#E6EAF0] sm:w-auto')}
            >
              Editar
            </Link>
            <Link
              href={`/admin/orders/new?client=${id}`}
              className={cn(buttonVariants({ size: 'sm' }), 'w-full justify-center bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-white font-semibold shadow-sm hover:brightness-105 sm:w-auto')}
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
      <div className="bg-white border border-[#E6EAF0] rounded-xl p-5 mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-[#1A1F36] font-semibold">Link general del cliente</h2>
              <Badge
                className={
                  client.client_portal_enabled
                    ? 'bg-[#2ED39A]/10 text-[#2ED39A] border-[#2ED39A]/30'
                    : 'bg-[#E6EAF0] text-[#6B7280] border-[#D8DEE8]'
                }
              >
                {client.client_portal_enabled ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <p className="text-[#6B7280] text-sm">
              Muestra todas las órdenes del cliente, saldos pendientes y progreso de pagos.
            </p>
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
                className="w-full justify-center border-[#D8DEE8] text-[#1A1F36] hover:bg-[#E6EAF0] hover:text-[#1A1F36] sm:w-auto"
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
          <h2 className="text-lg font-semibold text-[#1A1F36] mb-3">
            Órdenes activas ({activeOrders.length})
          </h2>
          <div className="space-y-3">
            {activeOrders.map((order) => {
              const percent = getProgressPercent(order.paid_amount, order.total_amount)
              return (
                <Link key={order.id} href={`/admin/orders/${order.id}`} className="block">
                  <div className="bg-white border border-[#E6EAF0] hover:border-[#C9D4E5] rounded-xl p-4 transition-colors">
                    <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <p className="text-[#1A1F36] font-medium">{order.concept}</p>
                      <Badge
                        className={
                          order.status === 'partial'
                            ? 'bg-[#F4B740]/10 text-[#F4B740] border-[#F4B740]/30'
                            : 'bg-[#E6EAF0] text-[#6B7280] border-[#D8DEE8]'
                        }
                      >
                        {order.status === 'partial' ? 'Parcial' : 'Pendiente'}
                      </Badge>
                    </div>
                    <div className="h-1.5 bg-[#E6EAF0] rounded-full mb-2">
                      <div className="h-full bg-[#2ED39A] rounded-full" style={{ width: `${percent}%` }} />
                    </div>
                    <div className="flex justify-between text-xs font-mono text-[#6B7280]">
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
          <h2 className="text-lg font-semibold text-[#6B7280] mb-3">
            Órdenes liquidadas ({completedOrders.length})
          </h2>
          <div className="space-y-2">
            {completedOrders.map((order) => (
              <Link key={order.id} href={`/admin/orders/${order.id}`} className="block">
                <div className="bg-white border border-[#E6EAF0] hover:border-[#D8DEE8] rounded-xl p-4 transition-colors">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-[#6B7280]">{order.concept}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[#6B7280] text-sm font-mono">{formatCurrency(order.total_amount)}</span>
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
