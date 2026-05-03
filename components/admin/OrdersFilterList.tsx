'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDateShort, getProgressPercent } from '@/lib/utils'
import type { OrderWithClient } from '@/types'

type StatusFilter = 'all' | 'pending' | 'partial' | 'completed' | 'active'
type InvoiceFilter = 'all' | 'invoice' | 'no_invoice'
type SortMode = 'recent' | 'pending_amount' | 'total_amount' | 'client'

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

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3 lg:grid-cols-[1fr_180px_150px_150px_170px]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por concepto, cliente o descripción..."
            className="h-10 bg-zinc-900 border-zinc-800 pl-9 text-zinc-50"
          />
        </div>

        <Select value={clientId} onValueChange={(value) => value && setClientId(value)}>
          <SelectTrigger className="h-10 w-full bg-zinc-900 border-zinc-800 text-zinc-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all" className="text-zinc-200 focus:bg-zinc-800">Todos los clientes</SelectItem>
            {clients.map(([id, name]) => (
              <SelectItem key={id} value={id} className="text-zinc-200 focus:bg-zinc-800">{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
          <SelectTrigger className="h-10 w-full bg-zinc-900 border-zinc-800 text-zinc-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="active" className="text-zinc-200 focus:bg-zinc-800">Activas</SelectItem>
            <SelectItem value="all" className="text-zinc-200 focus:bg-zinc-800">Todas</SelectItem>
            <SelectItem value="pending" className="text-zinc-200 focus:bg-zinc-800">Pendientes</SelectItem>
            <SelectItem value="partial" className="text-zinc-200 focus:bg-zinc-800">Parciales</SelectItem>
            <SelectItem value="completed" className="text-zinc-200 focus:bg-zinc-800">Liquidadas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={invoice} onValueChange={(value) => setInvoice(value as InvoiceFilter)}>
          <SelectTrigger className="h-10 w-full bg-zinc-900 border-zinc-800 text-zinc-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="all" className="text-zinc-200 focus:bg-zinc-800">Factura: todas</SelectItem>
            <SelectItem value="invoice" className="text-zinc-200 focus:bg-zinc-800">Con factura</SelectItem>
            <SelectItem value="no_invoice" className="text-zinc-200 focus:bg-zinc-800">Sin factura</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(value) => setSort(value as SortMode)}>
          <SelectTrigger className="h-10 w-full bg-zinc-900 border-zinc-800 text-zinc-50">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            <SelectItem value="recent" className="text-zinc-200 focus:bg-zinc-800">Más recientes</SelectItem>
            <SelectItem value="pending_amount" className="text-zinc-200 focus:bg-zinc-800">Mayor pendiente</SelectItem>
            <SelectItem value="total_amount" className="text-zinc-200 focus:bg-zinc-800">Mayor total</SelectItem>
            <SelectItem value="client" className="text-zinc-200 focus:bg-zinc-800">Cliente A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Órdenes filtradas" value={String(filteredOrders.length)} />
        <Metric label="Por cobrar" value={formatCurrency(totalPending)} />
        <Metric label="Cobrado" value={formatCurrency(totalCollected)} />
      </div>

      {!filteredOrders.length ? (
        <div className="text-center py-16 text-zinc-600">
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
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold text-zinc-100">{value}</p>
    </div>
  )
}

function OrderCard({ order }: { order: OrderWithClient }) {
  const percent = getProgressPercent(order.paid_amount, order.total_amount)
  const remaining = order.total_amount - order.paid_amount

  return (
    <Link href={`/admin/orders/${order.id}`} className="block">
      <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl p-4 transition-colors">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0">
            <p className="text-zinc-50 font-medium truncate">{order.concept}</p>
            <p className="text-zinc-500 text-sm truncate">{order.clients.name}</p>
            {order.requires_invoice && (
              <p className="mt-1 text-xs text-emerald-400/80">
                Factura · {order.tax_mode === 'included' ? 'IVA incluido' : 'IVA agregado'}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-zinc-300 text-sm font-mono hidden sm:block">
              {formatCurrency(order.total_amount)}
            </span>
            <StatusBadge status={order.status} />
          </div>
        </div>

        <div className="h-1.5 bg-zinc-800 rounded-full mb-2">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
        </div>

        <div className="flex justify-between text-xs font-mono text-zinc-500">
          <span>{formatCurrency(order.paid_amount)} pagado</span>
          {order.status !== 'completed' ? (
            <span className="text-amber-400">{formatCurrency(remaining)} pendiente</span>
          ) : (
            <span className="text-emerald-400">Liquidado</span>
          )}
        </div>

        <p className="text-xs text-zinc-700 mt-1">{formatDateShort(order.created_at)}</p>
      </div>
    </Link>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Liquidado</Badge>
  }
  if (status === 'partial') {
    return <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">Parcial</Badge>
  }
  return <Badge className="bg-zinc-800 text-zinc-400 border-zinc-700">Pendiente</Badge>
}
