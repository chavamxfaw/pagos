import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateShort, cn } from '@/lib/utils'

export default async function ClientsPage() {
  const supabase = await createClient()

  const { data: clients } = await supabase
    .from('clients')
    .select(`
      *,
      orders(id, status)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Clientes</h1>
          <p className="text-zinc-500 text-sm mt-1">{clients?.length ?? 0} clientes registrados</p>
        </div>
        <Link href="/admin/clients/new" className={cn(buttonVariants(), "bg-emerald-500 hover:bg-emerald-400 text-black font-semibold")}>
          + Nuevo cliente
        </Link>
      </div>

      {!clients?.length ? (
        <div className="text-center py-20 text-zinc-600">
          <p className="text-lg mb-2">Sin clientes aún</p>
          <Link href="/admin/clients/new" className="text-emerald-400 hover:text-emerald-300 text-sm">
            Agregar primer cliente →
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Teléfono</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Órdenes</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">Desde</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const activeOrders = client.orders?.filter(
                  (o: { status: string }) => o.status !== 'completed'
                ).length ?? 0
                const totalOrders = client.orders?.length ?? 0

                return (
                  <tr
                    key={client.id}
                    className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/admin/clients/${client.id}`} className="block">
                        <p className="text-zinc-100 font-medium hover:text-emerald-400 transition-colors">
                          {client.name}
                        </p>
                        <p className="text-zinc-500 text-sm">{client.email}</p>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-sm hidden sm:table-cell">
                      {client.phone ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-300 text-sm font-mono">{totalOrders}</span>
                        {activeOrders > 0 && (
                          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
                            {activeOrders} activa{activeOrders !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-zinc-500 text-sm hidden md:table-cell">
                      {formatDateShort(client.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
