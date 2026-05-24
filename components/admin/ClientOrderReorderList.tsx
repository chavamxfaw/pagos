'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { updateClientOrderSort } from '@/actions/orders'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, getProgressPercent } from '@/lib/utils'
import type { Order } from '@/types'

type ClientOrderListItem = Pick<Order, 'id' | 'concept' | 'paid_amount' | 'total_amount' | 'status' | 'public_sort_order'>

export function ClientOrderReorderList({
  clientId,
  orders,
}: {
  clientId: string
  orders: ClientOrderListItem[]
}) {
  const sortedOrders = useMemo(() => sortOrders(orders), [orders])
  const [items, setItems] = useState(sortedOrders)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function persistOrder(nextItems: ClientOrderListItem[]) {
    setItems(nextItems)
    startTransition(async () => {
      try {
        await updateClientOrderSort(clientId, nextItems.map((order) => order.id))
        toast.success('Orden público actualizado')
      } catch (error) {
        setItems(items)
        toast.error(error instanceof Error ? error.message : 'No se pudo guardar el orden')
      }
    })
  }

  function moveOrder(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= items.length) return
    const nextItems = reorder(items, fromIndex, toIndex)
    persistOrder(nextItems)
  }

  function handleDrop(targetId: string) {
    if (!draggingId || draggingId === targetId) return
    const fromIndex = items.findIndex((order) => order.id === draggingId)
    const toIndex = items.findIndex((order) => order.id === targetId)
    moveOrder(fromIndex, toIndex)
    setDraggingId(null)
  }

  return (
    <div className="space-y-3">
      {items.map((order, index) => {
        const percent = getProgressPercent(order.paid_amount, order.total_amount)
        return (
          <article
            key={order.id}
            draggable
            onDragStart={() => setDraggingId(order.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleDrop(order.id)}
            onDragEnd={() => setDraggingId(null)}
            className="rounded-xl border border-[#E6EAF0] bg-white p-4 transition-colors hover:border-[#C9D4E5] data-[dragging=true]:opacity-60"
            data-dragging={draggingId === order.id}
          >
            <div className="flex gap-3">
              <button
                type="button"
                aria-label="Arrastrar orden"
                className="mt-0.5 flex h-10 w-9 shrink-0 cursor-grab items-center justify-center rounded-lg border border-[#E6EAF0] text-[#8A94A6] active:cursor-grabbing"
              >
                <GripVertical className="size-4" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <Link href={`/admin/orders/${order.id}`} className="min-w-0 text-[#1A1F36] font-medium hover:text-[#4A8BFF]">
                    {order.concept}
                  </Link>
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

              <div className="flex shrink-0 flex-col gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={isPending || index === 0}
                  onClick={() => moveOrder(index, index - 1)}
                  aria-label="Subir orden"
                  className="h-9 w-9 border-[#D8DEE8]"
                >
                  <ArrowUp className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={isPending || index === items.length - 1}
                  onClick={() => moveOrder(index, index + 1)}
                  aria-label="Bajar orden"
                  className="h-9 w-9 border-[#D8DEE8]"
                >
                  <ArrowDown className="size-4" />
                </Button>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function sortOrders(orders: ClientOrderListItem[]) {
  return [...orders].sort((a, b) => {
    const sortDiff = (a.public_sort_order ?? 100) - (b.public_sort_order ?? 100)
    return sortDiff !== 0 ? sortDiff : a.concept.localeCompare(b.concept)
  })
}

function reorder<T>(items: T[], fromIndex: number, toIndex: number) {
  const nextItems = [...items]
  const [moved] = nextItems.splice(fromIndex, 1)
  nextItems.splice(toIndex, 0, moved)
  return nextItems
}
