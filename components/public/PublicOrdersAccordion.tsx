'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, ChevronDown, FileText } from 'lucide-react'
import { PublicBankDetails } from '@/components/public/PublicBankDetails'
import { PublicStripePayment } from '@/components/public/PublicStripePayment'
import { cn, formatCurrency, formatDateShort, getOrderStatusLabel, getPaymentMethodLabel, getProgressPercent } from '@/lib/utils'
import type { BankAccount, OrderStatus, Payment, StripePaymentRequest, StripeSettings } from '@/types'

export type PublicAccordionOrder = {
  id: string
  concept: string
  description: string | null
  status: OrderStatus
  total_amount: number
  paid_amount: number
  due_date: string | null
  issued_at: string
  created_at: string
  token: string
  stripe_payment_requests?: StripePaymentRequest[]
  payments: Payment[]
  bank_accounts: BankAccount | null
}

export function PublicOrdersAccordion({
  orders,
  title,
  showDetailLinks = true,
  defaultOpenFirst = false,
  stripeSettings,
}: {
  orders: PublicAccordionOrder[]
  title: string
  showDetailLinks?: boolean
  defaultOpenFirst?: boolean
  stripeSettings?: StripeSettings
}) {
  const initialOpen = useMemo(() => {
    if (!defaultOpenFirst || orders.length === 0) return {}
    return { [orders[0].id]: true }
  }, [defaultOpenFirst, orders])
  const [openItems, setOpenItems] = useState<Record<string, boolean>>(initialOpen)

  if (orders.length === 0) return null

  return (
    <section className="mb-8">
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8A94A6]">Detalle</p>
      <h2 className="mb-3 text-lg font-bold text-[#1A1F36]">
        {title} <span className="ml-1 text-[#8A94A6]">{orders.length}</span>
      </h2>

      <div className="grid gap-3">
        {orders.map((order) => {
          const percent = getProgressPercent(order.paid_amount, order.total_amount)
          const remaining = Math.max(0, order.total_amount - order.paid_amount)
          const completed = order.status === 'completed'
          const isOpen = openItems[order.id] ?? false
          const dueLabel = order.due_date ? `Vence ${formatDateShort(order.due_date)}` : `Emitida ${formatDateShort(order.issued_at ?? order.created_at)}`
          const pendingStripeRequest = order.stripe_payment_requests?.find((request) => request.status === 'pending')
          const canPayWithStripe = Boolean(stripeSettings?.enabled && pendingStripeRequest && !completed && remaining > 0)

          return (
            <article
              key={order.id}
              className={cn(
                'overflow-hidden rounded-2xl border bg-white shadow-[0_14px_30px_rgba(26,31,54,0.04)] transition-all',
                isOpen ? 'border-[#C8D0FF] ring-2 ring-[#EEF2FF]' : 'border-[#E6EAF0]'
              )}
            >
              <button
                type="button"
                onClick={() => setOpenItems((current) => ({ ...current, [order.id]: !isOpen }))}
                className="flex min-h-[96px] w-full items-start gap-3 px-4 py-4 text-left sm:items-center"
                aria-expanded={isOpen}
              >
                <span className={cn('mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl sm:mt-0', completed ? 'bg-[#EAFBF5] text-[#2ED39A]' : 'bg-[#FFF7E6] text-[#F4B740]')}>
                  {completed ? <CheckCircle2 className="size-5" /> : <FileText className="size-5" />}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-base font-bold text-[#1A1F36]">{order.concept}</span>
                    <span className={cn('inline-flex min-h-6 items-center rounded-full px-2 text-xs font-semibold', completed ? 'bg-[#EAFBF5] text-[#129B70]' : order.status === 'partial' ? 'bg-[#FFF7E6] text-[#B77900]' : 'bg-[#EEF2FF] text-[#6B7280]')}>
                      {getOrderStatusLabel(order.status)}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-[#6B7280]">
                    {dueLabel} · {formatCurrency(remaining)} pendiente
                  </span>
                  <span className="mt-3 block h-2 overflow-hidden rounded-full bg-[#E6EAF0]">
                    <span
                      className="block h-full rounded-full bg-[#2ED39A] transition-all duration-700"
                      style={{ width: `${percent}%` }}
                    />
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <span className="block font-mono text-base font-bold text-[#1A1F36]">{formatCurrency(order.total_amount)}</span>
                  <span className="mt-1 block text-xs text-[#8A94A6]">{percent}% pagado</span>
                  <ChevronDown className={cn('ml-auto mt-3 size-5 text-[#8A94A6] transition-transform', isOpen && 'rotate-180')} />
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-[#E6EAF0] px-4 pb-4 pt-4">
                  {order.description && <p className="mb-4 text-sm text-[#6B7280]">{order.description}</p>}

                  <div className="mb-4 grid gap-3 rounded-2xl bg-[#F8FAFF] p-4 text-sm ring-1 ring-[#E6EAF0] sm:grid-cols-3">
                    <BalanceItem label="Pagado" value={formatCurrency(order.paid_amount)} tone="paid" />
                    <BalanceItem label="Pendiente" value={formatCurrency(remaining)} tone="pending" />
                    <BalanceItem label="Abonos" value={`${order.payments.length}`} />
                  </div>

                  {showDetailLinks && (
                    <Link
                      href={`/p/${order.token}`}
                      className="mb-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#D8DEE8] bg-white px-4 text-sm font-semibold text-[#1A1F36] transition-colors hover:bg-[#F8FAFF] sm:w-auto"
                    >
                      Ver detalle completo
                    </Link>
                  )}

                  {!completed && order.bank_accounts && (
                    <div className="mb-4">
                      <PublicBankDetails bankAccount={order.bank_accounts} pendingAmount={remaining} compact />
                    </div>
                  )}

                  {canPayWithStripe && stripeSettings && pendingStripeRequest && (
                    <div className="mb-4">
                      <PublicStripePayment
                        orderId={order.id}
                        token={order.token}
                        pendingAmount={remaining}
                        request={pendingStripeRequest}
                        settings={stripeSettings}
                      />
                    </div>
                  )}

                  {order.payments.length > 0 && (
                    <div className="rounded-2xl border border-[#E6EAF0] bg-white p-4">
                      <div className="mb-4 flex items-center gap-2">
                        <CalendarDays className="size-4 text-[#6C5CE7]" />
                        <h3 className="text-sm font-bold text-[#1A1F36]">Historial de abonos</h3>
                      </div>
                      <div className="grid gap-3">
                        {order.payments.map((payment) => (
                          <div key={payment.id} className="flex items-start justify-between gap-3 border-t border-[#E6EAF0] pt-3 first:border-t-0 first:pt-0">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-[#1A1F36]">{payment.concept}</p>
                              <p className="mt-1 text-xs text-[#8A94A6]">
                                {formatDateShort(payment.paid_at ?? payment.created_at)} · {getPaymentMethodLabel(payment.payment_method)}
                                {payment.payment_reference ? ` · Ref: ${payment.payment_reference}` : ''}
                              </p>
                            </div>
                            <span className="shrink-0 font-mono text-sm font-bold text-[#2ED39A]">
                              +{formatCurrency(payment.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}

function BalanceItem({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'paid' | 'pending'
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A94A6]">{label}</p>
      <p className={cn('mt-1 font-mono font-bold text-[#1A1F36]', tone === 'paid' && 'text-[#2ED39A]', tone === 'pending' && 'text-[#F4B740]')}>
        {value}
      </p>
    </div>
  )
}
