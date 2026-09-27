'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, ChevronDown, ExternalLink, FileText, ReceiptText } from 'lucide-react'
import { PublicBankDetails } from '@/components/public/PublicBankDetails'
import { PublicStripePayment } from '@/components/public/PublicStripePayment'
import { cn, formatCurrency, formatDateShort, getOrderStatusLabel, getPaymentMethodLabel, getProgressPercent } from '@/lib/utils'
import type { BankAccount, FiscalDocument, OrderStatus, Payment, StripePaymentRequest, StripeSettings } from '@/types'

export type PublicAccordionOrder = {
  id: string
  concept: string
  description: string | null
  status: OrderStatus
  requires_invoice: boolean
  tax_mode: 'none' | 'included' | 'added'
  subtotal_amount: number
  tax_amount: number
  tax_rate: number
  total_amount: number
  paid_amount: number
  due_date: string | null
  issued_at: string
  created_at: string
  token: string
  stripe_payment_requests?: StripePaymentRequest[]
  payments: Payment[]
  bank_accounts: BankAccount | null
  fiscal_documents?: FiscalDocument | null
  public_show_fiscal_document?: boolean
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
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Detalle</p>
      <h2 className="mb-3 text-lg font-semibold text-foreground">
        {title} <span className="ml-1 text-muted-foreground">{orders.length}</span>
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
                'overflow-hidden rounded-xl border bg-white  transition-all',
                isOpen ? 'border-primary/20 ring-2 ring-primary/5' : 'border-border'
              )}
            >
              <button
                type="button"
                onClick={() => setOpenItems((current) => ({ ...current, [order.id]: !isOpen }))}
                className="flex min-h-[96px] w-full flex-wrap items-start gap-3 px-4 py-4 text-left hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:flex-nowrap sm:items-center"
                aria-expanded={isOpen}
              >
                <span className={cn('mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl sm:mt-0', completed ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                  {completed ? <CheckCircle2 className="size-5" /> : <FileText className="size-5" />}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="break-words text-base font-semibold text-foreground">{order.concept}</span>
                    <span className={cn('inline-flex min-h-6 items-center rounded-full px-2 text-xs font-semibold', completed ? 'bg-emerald-50 text-emerald-700' : order.status === 'partial' ? 'bg-amber-50 text-amber-700' : 'bg-secondary text-muted-foreground')}>
                      {getOrderStatusLabel(order.status)}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {dueLabel} · {formatCurrency(remaining)} pendiente
                  </span>
                  <span className="mt-3 block h-2 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full bg-primary transition-all duration-700"
                      style={{ width: `${percent}%` }}
                    />
                  </span>
                </span>

                <span className="ml-14 flex w-full items-center justify-between gap-3 text-right sm:ml-0 sm:block sm:w-auto sm:shrink-0">
                  <span className="block font-mono text-base font-semibold text-foreground">{formatCurrency(order.total_amount)}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{percent}% pagado</span>
                  <ChevronDown className={cn('ml-auto mt-3 size-5 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-border px-4 pb-4 pt-4">
                  {order.description && <p className="mb-4 text-sm text-muted-foreground">{order.description}</p>}

                  <div className="mb-4 grid gap-3 rounded-xl bg-muted/40 p-4 text-sm ring-1 ring-border sm:grid-cols-3">
                    <BalanceItem label="Pagado" value={formatCurrency(order.paid_amount)} tone="paid" />
                    <BalanceItem label="Pendiente" value={formatCurrency(remaining)} tone="pending" />
                    <BalanceItem label="Abonos" value={`${order.payments.length}`} />
                  </div>

                  {order.requires_invoice && (
                    <div className="mb-4 rounded-xl border border-border bg-white p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Factura</p>
                          <h3 className="text-sm font-semibold text-foreground">Desglose fiscal</h3>
                        </div>
                        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-primary">
                          {order.tax_mode === 'included' ? 'IVA incluido' : 'IVA agregado'}
                        </span>
                      </div>
                      <div className="grid gap-3 text-sm sm:grid-cols-3">
                        <BalanceItem label="Subtotal" value={formatCurrency(order.subtotal_amount)} />
                        <BalanceItem label={`IVA ${Math.round(order.tax_rate * 100)}%`} value={formatCurrency(order.tax_amount)} />
                        <BalanceItem label="Total" value={formatCurrency(order.total_amount)} />
                      </div>
                    </div>
                  )}

                  {order.public_show_fiscal_document && order.fiscal_documents?.is_active && (
                    <a
                      href={`/d/${order.fiscal_documents.share_token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mb-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted/40 sm:w-auto"
                    >
                      <FileText className="size-4 text-primary" />
                      Ver constancia fiscal
                      <ExternalLink className="size-4 text-muted-foreground" />
                    </a>
                  )}

                  {showDetailLinks && (
                    <Link
                      href={`/p/${order.token}`}
                      className="mb-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-white px-4 text-sm font-semibold text-foreground transition-colors hover:bg-muted/40 sm:w-auto"
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
                    <div className="rounded-xl border border-border bg-white p-4">
                      <div className="mb-4 flex items-center gap-2">
                        <CalendarDays className="size-4 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground">Historial de abonos</h3>
                      </div>
                      <div className="grid gap-3">
                        {order.payments.map((payment) => (
                          <div key={payment.id} className="flex items-start justify-between gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">{payment.concept}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatDateShort(payment.paid_at ?? payment.created_at)} · {getPaymentMethodLabel(payment.payment_method)}
                                {payment.payment_reference ? ` · Ref: ${payment.payment_reference}` : ''}
                              </p>
                              {payment.receipt_token && (
                                <Link
                                  href={`/r/${payment.receipt_token}`}
                                  className="mt-2 inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-white px-2.5 text-xs font-semibold text-primary hover:bg-muted/40"
                                >
                                  <ReceiptText className="size-3.5" />
                                  Ver recibo
                                </Link>
                              )}
                            </div>
                            <span className="shrink-0 font-mono text-sm font-semibold text-emerald-700">
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
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className={cn('mt-1 font-mono font-semibold text-foreground', tone === 'paid' && 'text-emerald-700', tone === 'pending' && 'text-amber-700')}>
        {value}
      </p>
    </div>
  )
}
