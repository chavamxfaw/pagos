'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { buttonVariants } from '@/components/ui/button'
import { cn, formatDateShort } from '@/lib/utils'
import type { Client } from '@/types'

type ClientRow = Client & {
  orders?: { id: string; status: string }[]
}

type ClientFilter = 'all' | 'active' | 'no_orders' | 'portal_active'

export function ClientsFilterList({ clients }: { clients: ClientRow[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ClientFilter>('all')

  const filteredClients = useMemo(() => {
    const needle = query.trim().toLowerCase()

    return clients.filter((client) => {
      const activeOrders = client.orders?.filter((order) => order.status !== 'completed').length ?? 0
      const totalOrders = client.orders?.length ?? 0

      if (filter === 'active' && activeOrders === 0) return false
      if (filter === 'no_orders' && totalOrders > 0) return false
      if (filter === 'portal_active' && !client.client_portal_enabled) return false

      if (!needle) return true

      return [
        client.name,
        client.company,
        client.email,
        client.phone,
        client.rfc,
      ].some((value) => value?.toLowerCase().includes(needle))
    })
  }, [clients, filter, query])

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3 sm:grid-cols-[1fr_220px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, empresa, correo, teléfono o RFC..."
            className="h-10 bg-zinc-900 border-zinc-800 pl-9 text-zinc-50"
          />
        </div>
        <Select value={filter} onValueChange={(value) => setFilter(value as ClientFilter)}>
          <SelectTrigger className="h-10 w-full bg-zinc-900 border-zinc-800 text-zinc-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all" className="text-zinc-200 focus:bg-zinc-800">Todos</SelectItem>
            <SelectItem value="active" className="text-zinc-200 focus:bg-zinc-800">Con órdenes activas</SelectItem>
            <SelectItem value="no_orders" className="text-zinc-200 focus:bg-zinc-800">Sin órdenes</SelectItem>
            <SelectItem value="portal_active" className="text-zinc-200 focus:bg-zinc-800">Link general activo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-zinc-500">
        {filteredClients.length} de {clients.length} clientes
      </p>

      {!filteredClients.length ? (
        <div className="text-center py-16 text-zinc-600">
          <p className="text-lg mb-2">Sin resultados</p>
          <p className="text-sm">Ajusta la búsqueda o cambia el filtro.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-800 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950">
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden sm:table-cell">Teléfono</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Órdenes</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden lg:table-cell">Acciones</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider hidden md:table-cell">Desde</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const activeOrders = client.orders?.filter((order) => order.status !== 'completed').length ?? 0
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
                        {client.company && <p className="text-zinc-600 text-xs">{client.company}</p>}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 text-sm hidden sm:table-cell">
                      {client.phone ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-zinc-300 text-sm font-mono">{totalOrders}</span>
                        {activeOrders > 0 && (
                          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-xs">
                            {activeOrders} activa{activeOrders !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {client.client_portal_enabled && (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                            Link
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <Link
                        href={`/admin/orders/new?client=${client.id}`}
                        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'border-zinc-700 text-zinc-300 hover:bg-zinc-800')}
                      >
                        Nueva orden
                      </Link>
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
