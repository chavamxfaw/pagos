'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Download, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDateShort, getProgressPercent } from '@/lib/utils'
import type { OrderWithClient } from '@/types'

type StatusFilter = 'all' | 'pending' | 'partial' | 'completed' | 'active'
type InvoiceFilter = 'all' | 'invoice' | 'no_invoice'
type SortMode = 'recent' | 'pending_amount' | 'total_amount' | 'client'

const statusLabels: Record<string, string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  completed: 'Liquidado',
}

const taxModeLabels: Record<string, string> = {
  none: 'Sin factura',
  included: 'IVA incluido',
  added: 'IVA agregado',
}

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

export function OrdersFilterList({ orders }: { orders: OrderWithClient[] }) {
  const [query, setQuery] = useState('')
  const [clientId, setClientId] = useState('all')
  const [status, setStatus] = useState<StatusFilter>('active')
  const [invoice, setInvoice] = useState<InvoiceFilter>('all')
  const [sort, setSort] = useState<SortMode>('recent')

  const clients = useMemo(() => {
    const unique = new Map<string, string>()
    for (const order of orders) unique.set(order.client_id, order.clients.name)
    return [...unique.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [orders])

  const filteredOrders = useMemo(() => {
    const needle = query.trim().toLowerCase()

    return orders
      .filter((order) => {
        if (clientId !== 'all' && order.client_id !== clientId) return false
        if (status === 'active' && order.status === 'completed') return false
        if (status !== 'all' && status !== 'active' && order.status !== status) return false
        if (invoice === 'invoice' && !order.requires_invoice) return false
        if (invoice === 'no_invoice' && order.requires_invoice) return false

        if (!needle) return true
        return [
          order.concept,
          order.description,
          order.clients.name,
          order.clients.company,
          order.clients.email,
        ].some((value) => value?.toLowerCase().includes(needle))
      })
      .sort((a, b) => {
        if (sort === 'pending_amount') {
          return (b.total_amount - b.paid_amount) - (a.total_amount - a.paid_amount)
        }
        if (sort === 'total_amount') {
          return b.total_amount - a.total_amount
        }
        if (sort === 'client') {
          return a.clients.name.localeCompare(b.clients.name)
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [clientId, invoice, orders, query, sort, status])

  const filteredActive = filteredOrders.filter((order) => order.status !== 'completed')
  const totalPending = filteredActive.reduce((sum, order) => sum + Math.max(0, order.total_amount - order.paid_amount), 0)
  const totalCollected = filteredOrders.reduce((sum, order) => sum + order.paid_amount, 0)

  function exportOrders() {
    const rows = filteredOrders.map((order) => {
      const remaining = Math.max(0, order.total_amount - order.paid_amount)
      const percent = getProgressPercent(order.paid_amount, order.total_amount)

      return [
        order.clients.name,
        order.clients.email,
        order.clients.phone,
        order.concept,
        order.description,
        statusLabels[order.status] ?? order.status,
        order.total_amount,
        order.paid_amount,
        remaining,
        `${percent}%`,
        order.requires_invoice ? 'Si' : 'No',
        taxModeLabels[order.tax_mode] ?? order.tax_mode,
        order.subtotal_amount,
        order.tax_amount,
        `${Math.round(order.tax_rate * 100)}%`,
        formatDateShort(order.created_at),
      ]
    })

    downloadCsv(`ordenes-${new Date().toISOString().slice(0, 10)}.csv`, [
      [
        'Cliente',
        'Correo',
        'Telefono',
        'Concepto',
        'Descripcion',
        'Estatus',
        'Total',
        'Pagado',
        'Pendiente',
        'Progreso',
        'Requiere factura',
        'Modo IVA',
        'Subtotal',
        'IVA',
        'Tasa IVA',
        'Creada',
      ],
      ...rows,
    ])
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-[#E6EAF0] bg-white p-3 lg:grid-cols-[1fr_180px_150px_150px_170px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8A94A6]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por concepto, cliente o descripción..."
            className="h-10 bg-white border-[#E6EAF0] pl-9 text-[#1A1F36]"
          />
        </div>

        <Select value={clientId} onValueChange={(value) => value && setClientId(value)}>
          <SelectTrigger className="h-10 w-full bg-white border-[#E6EAF0] text-[#1A1F36]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border-[#E6EAF0]">
            <SelectItem value="all" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Todos los clientes</SelectItem>
            {clients.map(([id, name]) => (
              <SelectItem key={id} value={id} className="text-[#1A1F36] focus:bg-[#E6EAF0]">{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
          <SelectTrigger className="h-10 w-full bg-white border-[#E6EAF0] text-[#1A1F36]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border-[#E6EAF0]">
            <SelectItem value="active" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Activas</SelectItem>
            <SelectItem value="all" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Todas</SelectItem>
            <SelectItem value="pending" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Pendientes</SelectItem>
            <SelectItem value="partial" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Parciales</SelectItem>
            <SelectItem value="completed" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Liquidadas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={invoice} onValueChange={(value) => setInvoice(value as InvoiceFilter)}>
          <SelectTrigger className="h-10 w-full bg-white border-[#E6EAF0] text-[#1A1F36]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border-[#E6EAF0]">
            <SelectItem value="all" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Factura: todas</SelectItem>
            <SelectItem value="invoice" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Con factura</SelectItem>
            <SelectItem value="no_invoice" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Sin factura</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(value) => setSort(value as SortMode)}>
          <SelectTrigger className="h-10 w-full bg-white border-[#E6EAF0] text-[#1A1F36]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border-[#E6EAF0]">
            <SelectItem value="recent" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Más recientes</SelectItem>
            <SelectItem value="pending_amount" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Mayor pendiente</SelectItem>
            <SelectItem value="total_amount" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Mayor total</SelectItem>
            <SelectItem value="client" className="text-[#1A1F36] focus:bg-[#E6EAF0]">Cliente A-Z</SelectItem>
          </SelectContent>
        </Select>

        <Button
          type="button"
          variant="outline"
          onClick={exportOrders}
          disabled={!filteredOrders.length}
          className="h-10 w-full justify-center border-[#D8DEE8] text-[#1A1F36] hover:bg-[#E6EAF0] lg:w-auto"
        >
          <Download className="size-4" />
          Exportar CSV
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Órdenes filtradas" value={String(filteredOrders.length)} />
        <Metric label="Por cobrar" value={formatCurrency(totalPending)} />
        <Metric label="Cobrado" value={formatCurrency(totalCollected)} />
      </div>

      {!filteredOrders.length ? (
        <div className="text-center py-16 text-[#8A94A6]">
          <p className="text-lg mb-2">Sin resultados</p>
          <p className="text-sm">Ajusta la búsqueda o cambia los filtros.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#E6EAF0] bg-white p-3">
      <p className="text-xs uppercase tracking-wider text-[#6B7280]">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-[#1A1F36]">{value}</p>
    </div>
  )
}

function OrderCard({ order }: { order: OrderWithClient }) {
  const percent = getProgressPercent(order.paid_amount, order.total_amount)
  const remaining = order.total_amount - order.paid_amount

  return (
    <Link href={`/admin/orders/${order.id}`} className="block">
      <div className="bg-white border border-[#E6EAF0] hover:border-[#C9D4E5] rounded-xl p-4 transition-colors">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[#1A1F36] font-medium truncate">{order.concept}</p>
            <p className="text-[#6B7280] text-sm truncate">{order.clients.name}</p>
            {order.requires_invoice && (
              <p className="mt-1 text-xs text-[#2ED39A]/80">
                Factura · {order.tax_mode === 'included' ? 'IVA incluido' : 'IVA agregado'}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
            <span className="text-[#1A1F36] text-sm font-mono hidden sm:block">
              {formatCurrency(order.total_amount)}
            </span>
            <StatusBadge status={order.status} />
          </div>
        </div>

        <div className="h-1.5 bg-[#E6EAF0] rounded-full mb-2">
          <div className="h-full rounded-full bg-[#2ED39A] transition-all" style={{ width: `${percent}%` }} />
        </div>

        <div className="flex justify-between text-xs font-mono text-[#6B7280]">
          <span>{formatCurrency(order.paid_amount)} pagado</span>
          {order.status !== 'completed' ? (
            <span className="text-[#F4B740]">{formatCurrency(remaining)} pendiente</span>
          ) : (
            <span className="text-[#2ED39A]">Liquidado</span>
          )}
        </div>

        <p className="text-xs text-[#A2ABBA] mt-1">{formatDateShort(order.created_at)}</p>
      </div>
    </Link>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return <Badge className="bg-[#2ED39A]/10 text-[#2ED39A] border-[#2ED39A]/30">Liquidado</Badge>
  }
  if (status === 'partial') {
    return <Badge className="bg-[#F4B740]/10 text-[#F4B740] border-[#F4B740]/30">Parcial</Badge>
  }
  return <Badge className="bg-[#E6EAF0] text-[#6B7280] border-[#D8DEE8]">Pendiente</Badge>
}
