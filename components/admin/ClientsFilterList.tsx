'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Download, MoreVertical, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { buttonVariants } from '@/components/ui/button'
import { cn, formatDateShort } from '@/lib/utils'
import type { Client } from '@/types'

type ClientRow = Client & {
  orders?: { id: string; status: string; total_amount?: number | null }[]
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

  const filterLabel = {
    all: 'Todos',
    active: 'Con órdenes activas',
    no_orders: 'Sin órdenes',
    portal_active: 'Link general activo',
  }[filter]

  function exportClients() {
    const rows = filteredClients.map((client) => {
      const activeOrders = client.orders?.filter((order) => order.status !== 'completed').length ?? 0
      const totalOrders = client.orders?.length ?? 0

      return [
        client.name,
        client.email ?? '',
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
      <div className="grid gap-3 rounded-2xl border border-white bg-white p-4 shadow-[0_16px_40px_rgba(26,31,54,0.06)] ring-1 ring-[#E6EAF0]/70 lg:grid-cols-[1fr_240px_auto]">
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
          <SelectTrigger className="h-10 w-full bg-white border-[#E6EAF0] text-[#1A1F36] shadow-sm">
            <SelectValue>{filterLabel}</SelectValue>
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
          className="h-10 w-full justify-center border-[#E6EAF0] bg-white px-5 text-[#1A1F36] shadow-sm hover:bg-[#F8FAFF] lg:w-auto"
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
        <div className="overflow-hidden rounded-2xl border border-white bg-white shadow-[0_18px_45px_rgba(26,31,54,0.07)] ring-1 ring-[#E6EAF0]/80">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#E6EAF0] bg-[#FBFCFF]">
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Cliente</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider hidden sm:table-cell">Teléfono</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Órdenes</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider hidden md:table-cell">Estado</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider hidden lg:table-cell">Acciones</th>
                <th className="text-left px-5 py-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider hidden xl:table-cell">Desde</th>
                <th className="w-12 px-4 py-4" />
              </tr>
            </thead>
            <tbody>
              {filteredClients.map((client) => {
                const activeOrders = client.orders?.filter((order) => order.status !== 'completed').length ?? 0
                const totalOrders = client.orders?.length ?? 0
                const avatarTone = getAvatarTone(client.name)

                return (
                  <tr
                    key={client.id}
                    className="border-b border-[#E6EAF0] transition-colors last:border-b-0 hover:bg-[#F8FAFF]"
                  >
                    <td className="px-6 py-5">
                      <Link href={`/admin/clients/${client.id}`} className="flex items-center gap-3">
                        <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-full text-base font-bold', avatarTone)}>
                          {client.name[0]?.toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-[#1A1F36] transition-colors hover:text-[#4A8BFF]">
                            {client.name}
                          </span>
                          <span className="block truncate text-sm text-[#6B7280]">{client.email ?? 'Sin correo'}</span>
                          {client.company && (
                            <span className="mt-1 inline-flex rounded-md bg-[#EEF2F7] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[#6B7280]">
                              {client.company}
                            </span>
                          )}
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-5 text-sm text-[#4B5565] hidden sm:table-cell">
                      {client.phone ?? '-'}
                    </td>
                    <td className="px-5 py-5">
                      <span className="font-mono text-sm font-semibold text-[#1A1F36]">{totalOrders}</span>
                    </td>
                    <td className="px-5 py-5 hidden md:table-cell">
                      <div className="flex flex-wrap items-center gap-2">
                        {totalOrders === 0 && (
                          <Badge className="border-[#D8DEE8] bg-[#EEF2F7] text-[#6B7280]">
                            Sin órdenes
                          </Badge>
                        )}
                        {activeOrders > 0 ? (
                          <Badge className="bg-[#F4B740]/10 text-[#F4B740] border-[#F4B740]/30 text-xs">
                            {activeOrders} activa{activeOrders !== 1 ? 's' : ''}
                          </Badge>
                        ) : totalOrders > 0 ? (
                          <Badge className="bg-[#2ED39A]/10 text-[#2ED39A] border-[#2ED39A]/30 text-xs">
                            Al corriente
                          </Badge>
                        ) : null}
                        {client.client_portal_enabled ? (
                          <Badge className="bg-[#2ED39A]/10 text-[#12A876] border-[#2ED39A]/30 text-xs">
                            Link
                          </Badge>
                        ) : (
                          <Badge className="hidden border-[#E6EAF0] bg-white text-[#8A94A6] lg:inline-flex">
                            Sin link
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-5 hidden lg:table-cell">
                      <Link
                        href={`/admin/orders/new?client=${client.id}`}
                        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'border-[#D8DEE8] bg-white px-4 text-[#6C5CE7] hover:bg-[#F8FAFF] hover:text-[#4A8BFF]')}
                      >
                        Nueva orden
                      </Link>
                    </td>
                    <td className="px-5 py-5 text-sm text-[#4B5565] hidden xl:table-cell">
                      {formatDateShort(client.created_at)}
                    </td>
                    <td className="px-4 py-5">
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="flex size-9 items-center justify-center rounded-xl border border-[#E6EAF0] text-[#8A94A6] transition-colors hover:bg-[#F8FAFF] hover:text-[#1A1F36]"
                        aria-label={`Ver cliente ${client.name}`}
                      >
                        <MoreVertical className="size-4" />
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}

function getAvatarTone(name: string) {
  const tones = [
    'bg-[#ECE8FF] text-[#6C5CE7]',
    'bg-[#E4F2FF] text-[#1F8BEA]',
    'bg-[#DDF8EE] text-[#13A674]',
    'bg-[#FFF0D8] text-[#E48A00]',
  ]
  const code = name.charCodeAt(0) || 0
  return tones[code % tones.length]
}
