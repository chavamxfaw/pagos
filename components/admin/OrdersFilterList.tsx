'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { createPortal } from 'react-dom'
import { Copy, Download, Edit3, Eye, MoreVertical, Search, SlidersHorizontal, Tags, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { deleteOrder } from '@/actions/orders'
import { formatCurrency, formatDateShort, getOrderStatusLabel, getOrderTiming, getProgressPercent, getTodayDateString } from '@/lib/utils'
import type { OrderCategory, OrderWithClient, PaymentMethod } from '@/types'

type OrderRow = OrderWithClient & {
  payments?: { payment_method: PaymentMethod }[]
}

type StatusFilter = 'all' | 'active' | 'pending' | 'partial' | 'completed' | 'overdue' | 'due_soon' | 'paused' | 'disputed' | 'cancelled'
type InvoiceFilter = 'all' | 'invoice' | 'no_invoice'
type PaymentFilter = 'all' | PaymentMethod
type CategoryFilter = 'all' | OrderCategory
type SortMode = 'recent' | 'pending_amount' | 'total_amount' | 'client'

const statusFilterLabels: Record<StatusFilter, string> = {
  active: 'Activas',
  all: 'Todas',
  pending: 'Pendientes',
  partial: 'Parciales',
  completed: 'Liquidadas',
  overdue: 'Vencidas',
  due_soon: 'Por vencer',
  paused: 'Pausadas',
  disputed: 'En disputa',
  cancelled: 'Canceladas',
}

const invoiceFilterLabels: Record<InvoiceFilter, string> = {
  all: 'Factura: todas',
  invoice: 'Con factura',
  no_invoice: 'Sin factura',
}

const paymentFilterLabels: Record<PaymentFilter, string> = {
  all: 'Pago: todos',
  transfer: 'Transferencia',
  cash: 'Efectivo',
  card: 'Tarjeta',
  stripe: 'Stripe',
  check: 'Cheque',
  other: 'Otro',
}

const categoryFilterLabels: Record<CategoryFilter, string> = {
  all: 'Categoría: todas',
  service: 'Servicios',
  product: 'Productos',
  project: 'Proyectos',
  subscription: 'Mensualidades',
  other: 'Otros',
}

const sortLabels: Record<SortMode, string> = {
  recent: 'Más recientes',
  pending_amount: 'Mayor pendiente',
  total_amount: 'Mayor total',
  client: 'Cliente A-Z',
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

export function OrdersFilterList({
  orders,
  initialStatus,
}: {
  orders: OrderRow[]
  initialStatus?: string
}) {
  const [query, setQuery] = useState('')
  const [clientId, setClientId] = useState('all')
  const [status, setStatus] = useState<StatusFilter>(getInitialStatus(initialStatus))
  const [invoice, setInvoice] = useState<InvoiceFilter>('all')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [paymentMethod, setPaymentMethod] = useState<PaymentFilter>('all')
  const [sort, setSort] = useState<SortMode>('recent')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const clients = useMemo(() => {
    const unique = new Map<string, string>()
    for (const order of orders) unique.set(order.client_id, order.clients.name)
    return [...unique.entries()].sort((a, b) => a[1].localeCompare(b[1]))
  }, [orders])

  const filteredOrders = useMemo(() => {
    const needle = query.trim().toLowerCase()

    return orders
      .filter((order) => {
        const timing = getOrderTiming(order)

        if (clientId !== 'all' && order.client_id !== clientId) return false
        if (status === 'active' && ['completed', 'cancelled'].includes(order.status)) return false
        if (status === 'overdue' && timing.key !== 'overdue') return false
        if (status === 'due_soon' && !['due_today', 'due_soon'].includes(timing.key)) return false
        if (!['all', 'active', 'overdue', 'due_soon'].includes(status) && order.status !== status) return false
        if (invoice === 'invoice' && !order.requires_invoice) return false
        if (invoice === 'no_invoice' && order.requires_invoice) return false
        if (category !== 'all' && (order.category ?? 'service') !== category) return false
        if (paymentMethod !== 'all' && !order.payments?.some((payment) => payment.payment_method === paymentMethod)) return false
        if (dateFrom && new Date(order.created_at) < new Date(`${dateFrom}T00:00:00`)) return false
        if (dateTo && new Date(order.created_at) > new Date(`${dateTo}T23:59:59`)) return false

        if (!needle) return true
        return [
          order.concept,
          order.description,
          order.clients.name,
          order.clients.company,
          order.clients.email,
          order.category,
          ...(order.tags ?? []),
        ].some((value) => value?.toLowerCase().includes(needle))
      })
      .sort((a, b) => {
        if (sort === 'pending_amount') return (b.total_amount - b.paid_amount) - (a.total_amount - a.paid_amount)
        if (sort === 'total_amount') return b.total_amount - a.total_amount
        if (sort === 'client') return a.clients.name.localeCompare(b.clients.name)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [category, clientId, dateFrom, dateTo, invoice, orders, paymentMethod, query, sort, status])

  const filteredActive = filteredOrders.filter((order) => !['completed', 'cancelled'].includes(order.status))
  const totalPending = filteredActive.reduce((sum, order) => sum + Math.max(0, order.total_amount - order.paid_amount), 0)
  const totalCollected = filteredOrders.reduce((sum, order) => sum + order.paid_amount, 0)
  const activeFilterCount = [
    clientId !== 'all',
    invoice !== 'all',
    category !== 'all',
    paymentMethod !== 'all',
    sort !== 'recent',
    !!dateFrom,
    !!dateTo,
  ].filter(Boolean).length

  function exportOrders() {
    const rows = filteredOrders.map((order) => {
      const remaining = Math.max(0, order.total_amount - order.paid_amount)
      const percent = getProgressPercent(order.paid_amount, order.total_amount)
      const timing = getOrderTiming(order)

      return [
        order.clients.name,
        order.clients.email ?? '',
        order.clients.phone,
        order.concept,
        order.description,
        categoryFilterLabels[(order.category ?? 'service') as CategoryFilter],
        (order.tags ?? []).join(', '),
        getOrderStatusLabel(order.status),
        order.total_amount,
        order.paid_amount,
        remaining,
        `${percent}%`,
        order.requires_invoice ? 'Si' : 'No',
        taxModeLabels[order.tax_mode] ?? order.tax_mode,
        order.subtotal_amount,
        order.tax_amount,
        `${Math.round(order.tax_rate * 100)}%`,
        order.issued_at ? formatDateShort(order.issued_at) : '',
        order.due_date ? formatDateShort(order.due_date) : '',
        timing.label ?? '',
        formatDateShort(order.created_at),
      ]
    })

    downloadCsv(`ordenes-${getTodayDateString()}.csv`, [
      [
        'Cliente',
        'Correo',
        'Telefono',
        'Concepto',
        'Descripcion',
        'Categoria',
        'Tags',
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
        'Emision',
        'Vencimiento',
        'Tiempo',
        'Creada',
      ],
      ...rows,
    ])
  }

  function resetFilters() {
    setClientId('all')
    setInvoice('all')
    setCategory('all')
    setPaymentMethod('all')
    setSort('recent')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden">
      <div className="-mx-4 flex max-w-[100vw] gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:max-w-full md:px-0 [&::-webkit-scrollbar]:hidden">
        {(['active', 'pending', 'partial', 'overdue', 'due_soon', 'completed', 'all'] as StatusFilter[]).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setStatus(item)}
            className={`h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition ${
              status === item
                ? 'border-transparent bg-primary text-primary-foreground shadow-none'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            {statusFilterLabels[item]}
          </button>
        ))}
      </div>

      <div className="min-w-0 rounded-xl border border-border bg-card p-3 shadow-none">
        <div className="grid min-w-0 gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por concepto, cliente, descripción o tags..."
            className="h-10 bg-card border-border pl-9 text-foreground"
          />
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => setShowFilters((current) => !current)}
          className="h-10 w-full min-w-0 justify-center border-border text-foreground hover:bg-secondary lg:w-auto"
          aria-expanded={showFilters}
        >
          <SlidersHorizontal className="size-4 text-primary" />
          Filtros
          {activeFilterCount > 0 && (
            <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
              {activeFilterCount}
            </span>
          )}
        </Button>

        <Button type="button" variant="outline" onClick={exportOrders} disabled={!filteredOrders.length} className="h-10 w-full min-w-0 justify-center border-border text-foreground hover:bg-muted lg:w-auto">
          <Download className="size-4" />
          Exportar CSV
        </Button>
        </div>

        {showFilters && (
          <div className="mt-3 border-t border-border pt-3">
            <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Select value={clientId} onValueChange={(value) => value && setClientId(value)}>
                <SelectTrigger className="h-10 w-full bg-card border-border text-foreground">
                  <SelectValue>{clientId === 'all' ? 'Todos los clientes' : clients.find(([id]) => id === clientId)?.[1]}</SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all" className="text-foreground focus:bg-muted">Todos los clientes</SelectItem>
                  {clients.map(([id, name]) => (
                    <SelectItem key={id} value={id} className="text-foreground focus:bg-muted">{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={category} onValueChange={(value) => setCategory(value as CategoryFilter)}>
                <SelectTrigger className="h-10 w-full bg-card border-border text-foreground">
                  <SelectValue>{categoryFilterLabels[category]}</SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all" className="text-foreground focus:bg-muted">Categoría: todas</SelectItem>
                  <SelectItem value="service" className="text-foreground focus:bg-muted">Servicios</SelectItem>
                  <SelectItem value="product" className="text-foreground focus:bg-muted">Productos</SelectItem>
                  <SelectItem value="project" className="text-foreground focus:bg-muted">Proyectos</SelectItem>
                  <SelectItem value="subscription" className="text-foreground focus:bg-muted">Mensualidades</SelectItem>
                  <SelectItem value="other" className="text-foreground focus:bg-muted">Otros</SelectItem>
                </SelectContent>
              </Select>

              <Select value={invoice} onValueChange={(value) => setInvoice(value as InvoiceFilter)}>
                <SelectTrigger className="h-10 w-full bg-card border-border text-foreground">
                  <SelectValue>{invoiceFilterLabels[invoice]}</SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all" className="text-foreground focus:bg-muted">Factura: todas</SelectItem>
                  <SelectItem value="invoice" className="text-foreground focus:bg-muted">Con factura</SelectItem>
                  <SelectItem value="no_invoice" className="text-foreground focus:bg-muted">Sin factura</SelectItem>
                </SelectContent>
              </Select>

              <Select value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as PaymentFilter)}>
                <SelectTrigger className="h-10 w-full bg-card border-border text-foreground">
                  <SelectValue>{paymentFilterLabels[paymentMethod]}</SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all" className="text-foreground focus:bg-muted">Pago: todos</SelectItem>
                  <SelectItem value="transfer" className="text-foreground focus:bg-muted">Transferencia</SelectItem>
                  <SelectItem value="cash" className="text-foreground focus:bg-muted">Efectivo</SelectItem>
                  <SelectItem value="card" className="text-foreground focus:bg-muted">Tarjeta</SelectItem>
                  <SelectItem value="check" className="text-foreground focus:bg-muted">Cheque</SelectItem>
                  <SelectItem value="other" className="text-foreground focus:bg-muted">Otro</SelectItem>
                </SelectContent>
              </Select>

              <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="h-10 bg-card border-border text-foreground" aria-label="Desde" />
              <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="h-10 bg-card border-border text-foreground" aria-label="Hasta" />
              <Select value={sort} onValueChange={(value) => setSort(value as SortMode)}>
                <SelectTrigger className="h-10 w-full bg-card border-border text-foreground">
                  <SelectValue>{sortLabels[sort]}</SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="recent" className="text-foreground focus:bg-muted">Más recientes</SelectItem>
                  <SelectItem value="pending_amount" className="text-foreground focus:bg-muted">Mayor pendiente</SelectItem>
                  <SelectItem value="total_amount" className="text-foreground focus:bg-muted">Mayor total</SelectItem>
                  <SelectItem value="client" className="text-foreground focus:bg-muted">Cliente A-Z</SelectItem>
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" onClick={resetFilters} className="h-10 border-border text-foreground hover:bg-secondary">
                <X className="size-4" />
                Limpiar
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-none md:flex-row md:items-center md:justify-between">
        <span>
          <strong className="tabular-nums text-foreground">{filteredOrders.length}</strong> orden{filteredOrders.length === 1 ? '' : 'es'} en esta vista
        </span>
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          <span>Por cobrar <strong className="tabular-nums text-foreground">{formatCurrency(totalPending)}</strong></span>
          <span>Cobrado <strong className="tabular-nums text-foreground">{formatCurrency(totalCollected)}</strong></span>
        </div>
      </div>

      {!filteredOrders.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg mb-2">Sin resultados</p>
          <p className="text-sm">Sin coincidencias.</p>
        </div>
      ) : (
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}

function getInitialStatus(value?: string): StatusFilter {
  if (value && value in statusFilterLabels) return value as StatusFilter
  return 'active'
}

function OrderCard({ order }: { order: OrderRow }) {
  const percent = getProgressPercent(order.paid_amount, order.total_amount)
  const remaining = order.total_amount - order.paid_amount
  const timing = getOrderTiming(order)

  return (
    <div className="relative flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-none transition hover:border-border hover:bg-card hover:shadow-none">
      <OrderActionsMenu order={order} />
      <Link href={`/admin/orders/${order.id}`} className="block h-full">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0 pr-10">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                {categoryFilterLabels[(order.category ?? 'service') as CategoryFilter].replace('Categoría: ', '')}
              </span>
              {order.requires_invoice && <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">Factura</span>}
            </div>
            <p className="text-foreground font-semibold truncate">{order.concept}</p>
            <p className="text-muted-foreground text-sm truncate">{order.clients.name}</p>
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              {timing.label && <span className={timing.key === 'overdue' ? 'text-destructive' : 'text-amber-700'}>{timing.label}</span>}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2 pr-8">
            <span className="text-foreground text-sm tabular-nums">{formatCurrency(order.total_amount)}</span>
            <StatusBadge status={order.status} />
          </div>
        </div>

        <div className="h-2 bg-muted rounded-full mb-3">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
        </div>

        <div className="mt-auto grid gap-2 text-xs tabular-nums text-muted-foreground">
          <div className="flex justify-between gap-3">
            <span>Pagado</span>
            <span className="text-foreground">{formatCurrency(order.paid_amount)}</span>
          </div>
          {!['completed', 'cancelled'].includes(order.status) ? (
            <div className="flex justify-between gap-3">
              <span>Pendiente</span>
              <span className="text-amber-700">{formatCurrency(remaining)}</span>
            </div>
          ) : (
            <div className="flex justify-between gap-3">
              <span>Estado</span>
              <span className="text-emerald-700">{getOrderStatusLabel(order.status)}</span>
            </div>
          )}
        </div>

        <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
          Emitida {formatDateShort(order.issued_at ?? order.created_at)}
        </p>
        {!!order.tags?.length && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
            {order.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[11px] font-medium text-muted-foreground">
                <Tags className="size-3" />
                {tag}
              </span>
            ))}
          </div>
        )}
      </Link>
    </div>
  )
}

function OrderActionsMenu({ order }: { order: OrderRow }) {
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const [open, setOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null)
  const publicUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/p/${order.token}`

  useEffect(() => {
    if (!open || !buttonRef.current) {
      setMenuPosition(null)
      return
    }

    function updatePosition() {
      if (!buttonRef.current) return
      const rect = buttonRef.current.getBoundingClientRect()
      setMenuPosition({
        top: Math.min(rect.bottom + 8, window.innerHeight - 260),
        right: Math.max(12, window.innerWidth - rect.right),
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  async function copyPublicLink() {
    await navigator.clipboard.writeText(publicUrl)
    toast.success('Link de orden copiado')
    setOpen(false)
  }

  return (
    <>
      <Button
        ref={buttonRef}
        type="button"
        variant="outline"
        size="icon"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setOpen((current) => !current)
        }}
        className="absolute right-4 top-4 z-10 size-9 rounded-xl border-border bg-card text-muted-foreground shadow-none hover:bg-secondary hover:text-foreground"
        aria-label={`Acciones para ${order.concept}`}
        aria-expanded={open}
      >
        <MoreVertical className="size-4" />
      </Button>

      {open && menuPosition && createPortal(
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            aria-label="Cerrar acciones"
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed z-50 w-56 overflow-hidden rounded-xl border border-border bg-card p-1.5 shadow-lg"
            style={{ top: menuPosition.top, right: menuPosition.right }}
          >
            <QuickActionLink href={`/admin/orders/${order.id}`} icon={<Eye className="size-4" />} onClick={() => setOpen(false)}>
              Ver detalle
            </QuickActionLink>
            <QuickActionLink href={`/admin/orders/${order.id}/edit`} icon={<Edit3 className="size-4" />} onClick={() => setOpen(false)}>
              Editar orden
            </QuickActionLink>
            <button
              type="button"
              onClick={copyPublicLink}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              <Copy className="size-4 text-muted-foreground" />
              Copiar link
            </button>
            <Dialog>
              <DialogTrigger
                render={
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-destructive transition-colors hover:bg-destructive/10"
                  >
                    <Trash2 className="size-4" />
                    Eliminar
                  </button>
                }
              />
              <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-foreground">Borrar orden</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Esto eliminará la orden {order.concept} y sus abonos asociados. Esta acción no se puede deshacer.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="border-border bg-card">
                  <DialogClose render={<Button type="button" variant="outline" />}>
                    Cancelar
                  </DialogClose>
                  <form action={deleteOrder.bind(null, order.id, order.client_id)}>
                    <Button
                      type="submit"
                      variant="destructive"
                      className="w-full bg-destructive/10 text-destructive hover:bg-destructive/20 sm:w-auto"
                    >
                      Borrar orden
                    </Button>
                  </form>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </>,
        document.body
      )}
    </>
  )
}

function QuickActionLink({
  href,
  icon,
  children,
  onClick,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
    >
      <span className="text-muted-foreground">{icon}</span>
      {children}
    </Link>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">Liquidado</Badge>
  if (status === 'partial') return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30">Parcial</Badge>
  if (status === 'cancelled') return <Badge className="bg-destructive/10 text-destructive border-destructive/30">Cancelado</Badge>
  if (status === 'paused') return <Badge className="bg-muted text-muted-foreground border-border">Pausado</Badge>
  if (status === 'disputed') return <Badge className="bg-destructive/10 text-destructive border-destructive/30">En disputa</Badge>
  return <Badge className="bg-muted text-muted-foreground border-border">Pendiente</Badge>
}
