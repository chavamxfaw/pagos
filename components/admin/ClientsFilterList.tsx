'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Download, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { buttonVariants } from '@/components/ui/button'
import { cn, formatDateShort } from '@/lib/utils'
import type { Client } from '@/types'

type ClientRow = Client & {
  orders?: { id: string; status: string }[]
}

type ClientFilter = 'all' | 'active' | 'no_orders' | 'portal_active'

function csvCell(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) return ''
  return `"${String(value).replaceAll('"', '""')}"`
}

function downloadCsv(filename: string, rows: (string | number | boolean | null | undefined)[][]) {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

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

  function exportClients() {
    const rows = filteredClients.map((client) => {
      const activeOrders = client.orders?.filter((order) => order.status !== 'completed').length ?? 0
      const totalOrders = client.orders?.length ?? 0

      return [
        client.name,
        client.email,
        client.phone,
        client.company,
        client.rfc,
        client.address,
        client.notes,
        client.client_portal_enabled ? 'Activo' : 'Inactivo',
        totalOrders,
        activeOrders,
        formatDateShort(client.created_at),
      ]
    })

    downloadCsv(`clientes-${new Date().toISOString().slice(0, 10)}.csv`, [
      [
        'Nombre',
        'Correo',
        'Telefono',
        'Empresa',
        'RFC',
        'Direccion',
        'Notas',
        'Link general',
        'Ordenes totales',
        'Ordenes activas',
        'Creado',
      ],
      ...rows,
    ])
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-[#E6EAF0] bg-white p-3 lg:grid-cols-[1fr_220px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8A94A6]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre, empresa, correo, teléfono o RFC..."
            className="h-10 bg-white border-[#E6EAF0] pl-9 text-[#1A1F36]"
          />
        </div>
        <Select value={filter} onValueChange={(value) => setFilter(value as ClientFilter)}>
          <SelectTrigger className="h-10 w-full bg-white border-[#E6EAF0] text-[#1A1F36]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border-[#E6EAF0]">
            <SelectItem value="all" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Todos</SelectItem>
            <SelectItem value="active" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Con órdenes activas</SelectItem>
            <SelectItem value="no_orders" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Sin órdenes</SelectItem>
            <SelectItem value="portal_active" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Link general activo</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          onClick={exportClients}
          disabled={!filteredClients.length}
          className="h-10 border-[#D8DEE8] text-[#1A1F36] hover:bg-[#E6EAF0]"
        >
          <Download className="size-4" />
          Exportar CSV
        </Button>
      </div>

      <p className="text-sm text-[#6B7280]">
        {filteredClients.length} de {clients.length} clientes
      </p>

      {!filteredClients.length ? (
        <div className="text-center py-16 text-[#8A94A6]">
          <p className="text-lg mb-2">Sin resultados</p>
          <p className="text-sm">Ajusta la búsqueda o cambia el filtro.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#E6EAF0] overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E6EAF0] bg-white">
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7280] uppercase tracking-wider">Cliente</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7280] uppercase tracking-wider hidden sm:table-cell">Teléfono</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7280] uppercase tracking-wider">Órdenes</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7280] uppercase tracking-wider hidden lg:table-cell">Acciones</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-[#6B7280] uppercase tracking-wider hidden md:table-cell">Desde</th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const activeOrders = client.orders?.filter((order) => order.status !== 'completed').length ?? 0
                const totalOrders = client.orders?.length ?? 0

                return (
                  <tr
                    key={client.id}
                    className="border-b border-[#E6EAF0] hover:bg-white/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/admin/clients/${client.id}`} className="block">
                        <p className="text-[#1A1F36] font-medium hover:text-[#2ED39A] transition-colors">
                          {client.name}
                        </p>
                        <p className="text-[#6B7280] text-sm">{client.email}</p>
                        {client.company && <p className="text-[#8A94A6] text-xs">{client.company}</p>}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] text-sm hidden sm:table-cell">
                      {client.phone ?? '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[#1A1F36] text-sm font-mono">{totalOrders}</span>
                        {activeOrders > 0 && (
                          <Badge className="bg-[#F4B740]/10 text-[#F4B740] border-[#F4B740]/30 text-xs">
                            {activeOrders} activa{activeOrders !== 1 ? 's' : ''}
                          </Badge>
                        )}
                        {client.client_portal_enabled && (
                          <Badge className="bg-[#2ED39A]/10 text-[#2ED39A] border-[#2ED39A]/30 text-xs">
                            Link
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <Link
                        href={`/admin/orders/new?client=${client.id}`}
                        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'border-[#D8DEE8] text-[#1A1F36] hover:bg-[#E6EAF0]')}
                      >
                        Nueva orden
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[#6B7280] text-sm hidden md:table-cell">
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
