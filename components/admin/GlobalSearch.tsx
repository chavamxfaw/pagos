'use client'

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Command, Package, Search, Tags, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn, formatCurrency } from '@/lib/utils'
import type { Client, OrderCategory, OrderStatus, OrderWithClient } from '@/types'

type GlobalSearchOrder = OrderWithClient

type SearchResult = {
  id: string
  type: 'client' | 'order'
  title: string
  subtitle: string
  href: string
  meta?: string
  status?: OrderStatus
  category?: OrderCategory
}

const categoryLabels: Record<OrderCategory, string> = {
  service: 'Servicio',
  product: 'Producto',
  project: 'Proyecto',
  subscription: 'Mensualidad',
  other: 'Otro',
}

const statusLabels: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  completed: 'Liquidada',
  cancelled: 'Cancelada',
  paused: 'Pausada',
  disputed: 'En disputa',
}

export function GlobalSearch({ clients, orders }: { clients: Client[]; orders: GlobalSearchOrder[] }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const results = useMemo(() => {
    const term = normalize(query)
    if (term.length < 2) return []

    const clientResults: SearchResult[] = clients
      .filter((client) => matches(term, [client.name, client.email, client.phone, client.company, client.rfc]))
      .slice(0, 5)
      .map((client) => ({
        id: client.id,
        type: 'client',
        title: client.name,
        subtitle: [client.company, client.email, client.phone].filter(Boolean).join(' · ') || 'Cliente sin datos de contacto',
        href: `/admin/clients/${client.id}`,
        meta: client.client_portal_enabled ? 'Link activo' : undefined,
      }))

    const orderResults: SearchResult[] = orders
      .filter((order) => matches(term, [
        order.concept,
        order.description,
        order.clients?.name,
        order.clients?.company,
        categoryLabels[order.category ?? 'service'],
        ...(order.tags ?? []),
      ]))
      .slice(0, 7)
      .map((order) => {
        const remaining = Math.max(0, order.total_amount - order.paid_amount)
        return {
          id: order.id,
          type: 'order',
          title: order.concept,
          subtitle: `${order.clients?.name ?? 'Cliente'} · ${formatCurrency(remaining)} pendiente`,
          href: `/admin/orders/${order.id}`,
          meta: categoryLabels[order.category ?? 'service'],
          status: order.status,
          category: order.category ?? 'service',
        }
      })

    return [...clientResults, ...orderResults].slice(0, 10)
  }, [clients, orders, query])

  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
        setOpen(true)
      }
    }

    function handlePointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousedown', handlePointerDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousedown', handlePointerDown)
    }
  }, [])

  function goToResult(result: SearchResult) {
    setOpen(false)
    setQuery('')
    router.push(result.href)
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
      setOpen(true)
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((index) => Math.min(index + 1, Math.max(0, results.length - 1)))
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
    }

    if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault()
      goToResult(results[activeIndex])
    }

    if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const clientResults = results.filter((result) => result.type === 'client')
  const orderResults = results.filter((result) => result.type === 'order')

  return (
    <div ref={wrapperRef} className="relative isolate z-[120] w-full">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#8A94A6]" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            const value = event.target.value
            setQuery(value)
            setActiveIndex(0)
            setOpen(value.trim().length >= 2)
          }}
          onFocus={() => setOpen(query.trim().length >= 2)}
          onKeyDown={handleInputKeyDown}
          placeholder="Buscar clientes, órdenes o tags..."
          className="h-11 rounded-2xl border-[#D8DEE8] bg-white pl-11 pr-16 text-[#1A1F36] shadow-sm"
        />
        <div className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-lg border border-[#E6EAF0] bg-[#F8FAFD] px-2 py-1 text-[11px] font-medium text-[#8A94A6] sm:flex">
          <Command className="size-3" />
          K
        </div>
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-[999] max-h-[min(70dvh,460px)] overflow-hidden rounded-2xl border border-[#D8DEE8] bg-white shadow-[0_24px_70px_rgba(26,31,54,0.18)]">
          {results.length ? (
            <div className="max-h-[min(70dvh,420px)] overflow-y-auto overscroll-contain p-2">
              {clientResults.length > 0 && (
                <ResultGroup
                  title="Clientes"
                  results={clientResults}
                  activeResult={results[activeIndex]}
                  onSelect={goToResult}
                />
              )}
              {orderResults.length > 0 && (
                <ResultGroup
                  title="Órdenes"
                  results={orderResults}
                  activeResult={results[activeIndex]}
                  onSelect={goToResult}
                />
              )}
            </div>
          ) : (
            <div className="p-5 text-center">
              <p className="text-sm font-semibold text-[#1A1F36]">Sin resultados</p>
              <p className="mt-1 text-sm text-[#6B7280]">Sin coincidencias.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ResultGroup({
  title,
  results,
  activeResult,
  onSelect,
}: {
  title: string
  results: SearchResult[]
  activeResult?: SearchResult
  onSelect: (result: SearchResult) => void
}) {
  return (
    <div className="py-1">
      <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A94A6]">{title}</p>
      <div className="space-y-1">
        {results.map((result) => (
          <button
            key={`${result.type}-${result.id}`}
            type="button"
            onMouseDown={(event) => {
              event.preventDefault()
              onSelect(result)
            }}
            className={cn(
              'flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition',
              activeResult?.id === result.id && activeResult.type === result.type ? 'bg-[#F0F4FF]' : 'hover:bg-[#F8FAFD]',
            )}
          >
            <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', result.type === 'client' ? 'bg-[#EEF2FF] text-[#6C5CE7]' : 'bg-[#FFF7E6] text-[#F4B740]')}>
              {result.type === 'client' ? <UserRound className="size-4" /> : <Package className="size-4" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-[#1A1F36]">{result.title}</span>
              <span className="mt-0.5 block truncate text-xs text-[#6B7280]">{result.subtitle}</span>
            </span>
            <span className="hidden shrink-0 items-center gap-2 sm:flex">
              {result.status && <StatusBadge status={result.status} />}
              {result.meta && (
                <Badge className="border-[#E6EAF0] bg-white text-[#6B7280]">
                  {result.category ? <Tags className="mr-1 size-3" /> : null}
                  {result.meta}
                </Badge>
              )}
              <ArrowRight className="size-4 text-[#8A94A6]" />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const className = {
    completed: 'border-[#2ED39A]/20 bg-[#2ED39A]/10 text-[#129B70]',
    partial: 'border-[#F4B740]/20 bg-[#FFF7E6] text-[#B77900]',
    pending: 'border-[#D8DEE8] bg-[#E6EAF0] text-[#6B7280]',
    cancelled: 'border-[#EF4444]/20 bg-[#FEE2E2] text-[#EF4444]',
    paused: 'border-[#D8DEE8] bg-[#F3F4F6] text-[#6B7280]',
    disputed: 'border-[#EF4444]/20 bg-[#FEE2E2] text-[#EF4444]',
  }[status]

  return <Badge className={className}>{statusLabels[status]}</Badge>
}

function normalize(value: string | number | null | undefined) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function matches(term: string, fields: Array<string | number | null | undefined>) {
  return fields.some((field) => normalize(field).includes(term))
}
