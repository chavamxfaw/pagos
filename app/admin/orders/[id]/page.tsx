import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { PaymentTimeline } from '@/components/admin/PaymentTimeline'
import { PaymentActions } from '@/components/admin/PaymentActions'
import { BankInstructionsPanel } from '@/components/admin/BankInstructionsPanel'
import { OrderActionsBar } from '@/components/admin/OrderActionsBar'
import { StripePaymentRequestsPanel } from '@/components/admin/StripePaymentRequestsPanel'
import { addPayment, deletePayment, resendPaymentReceipt, updatePayment } from '@/actions/payments'
import { sendBankInstructions } from '@/actions/bank-accounts'
import { deleteOrder, markOrderCompleted } from '@/actions/orders'
import { sendOrderReminder } from '@/actions/reminders'
import { cancelStripePaymentRequest, createStripePaymentRequest } from '@/actions/stripe-payment-requests'
import { formatCurrency, formatDateShort, getOrderStatusLabel, getOrderTiming, getProgressPercent } from '@/lib/utils'
import type { BankAccount, OrderWithClient, Payment, PaymentMethod, StripePaymentRequest } from '@/types'
import { failedOrderQueries, OrderQueryError } from '../QueryError'

type PaymentState = { error?: string; success?: boolean } | null

async function addPaymentAction(prevState: PaymentState, formData: FormData): Promise<PaymentState> {
  'use server'
  try {
    await addPayment({
      order_id: formData.get('order_id') as string,
      amount: parseFloat(formData.get('amount') as string),
      concept: formData.get('concept') as string,
      payment_method: formData.get('payment_method') as PaymentMethod,
      payment_reference: formData.get('payment_reference') as string || undefined,
      notes: formData.get('notes') as string || undefined,
      paid_at: formData.get('paid_at') as string,
    })
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al registrar abono' }
  }
}

async function updatePaymentAction(paymentId: string, prevState: PaymentState, formData: FormData): Promise<PaymentState> {
  'use server'
  try {
    await updatePayment(paymentId, {
      order_id: formData.get('order_id') as string,
      amount: parseFloat(formData.get('amount') as string),
      concept: formData.get('concept') as string,
      payment_method: formData.get('payment_method') as PaymentMethod,
      payment_reference: formData.get('payment_reference') as string || undefined,
      notes: formData.get('notes') as string || undefined,
      paid_at: formData.get('paid_at') as string,
    })
    return { success: true }
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : 'Error al actualizar abono' }
  }
}

async function deletePaymentAction(paymentId: string, orderId: string) {
  'use server'
  await deletePayment(paymentId, orderId)
}

async function resendPaymentReceiptAction(paymentId: string) {
  'use server'
  await resendPaymentReceipt(paymentId)
}

async function markCompletedAction(orderId: string) {
  'use server'
  await markOrderCompleted(orderId)
}

async function sendReminderAction(orderId: string) {
  'use server'
  return sendOrderReminder(orderId)
}

async function sendBankInstructionsAction(orderId: string, formData: FormData) {
  'use server'
  await sendBankInstructions(orderId, formData.get('bank_account_id') as string)
}

async function createStripePaymentRequestAction(formData: FormData) {
  'use server'
  await createStripePaymentRequest({
    order_id: formData.get('order_id') as string,
    request_type: formData.get('request_type') === 'open' ? 'open' : 'fixed',
    amount: getOptionalMoney(formData, 'amount'),
    minimum_amount: getOptionalMoney(formData, 'minimum_amount'),
    concept: (formData.get('concept') as string) || undefined,
    requires_invoice: formData.get('requires_invoice') === 'on',
    tax_mode: formData.get('tax_mode') as 'included' | 'added' | undefined,
    notes: (formData.get('notes') as string) || undefined,
  })
}

function getOptionalMoney(formData: FormData, key: string) {
  const value = Number.parseFloat(String(formData.get(key) ?? ''))
  return Number.isFinite(value) && value > 0 ? value : null
}

async function cancelStripePaymentRequestAction(formData: FormData) {
  'use server'
  await cancelStripePaymentRequest(formData.get('request_id') as string)
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('*, clients(*)')
    .eq('id', id)
    .maybeSingle()

  const orderFailures = failedOrderQueries('detail', [{ label: 'orden', error: orderError }])
  if (orderFailures.length) return <OrderQueryError title="Detalle de orden" resources={orderFailures} retryHref={`/admin/orders/${id}`} />
  if (!order) notFound()
  if (!order.clients) return <OrderQueryError title="Detalle de orden" resources={['contacto de la orden']} retryHref={`/admin/orders/${id}`} />

  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: false })

  const { data: bankAccounts, error: banksError } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const { data: stripePaymentRequests, error: requestsError } = await supabase
    .from('stripe_payment_requests')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: false })

  const failures = failedOrderQueries('detail', [{ label: 'abonos', error: paymentsError }, { label: 'cuentas bancarias', error: banksError }, { label: 'solicitudes de pago', error: requestsError }])
  if (failures.length) return <OrderQueryError title="Detalle de orden" resources={failures} retryHref={`/admin/orders/${id}`} />
  const typedOrder = order as OrderWithClient
  const typedPayments = (payments ?? []) as Payment[]
  const typedBankAccounts = (bankAccounts ?? []) as BankAccount[]
  const typedStripePaymentRequests = (stripePaymentRequests ?? []) as StripePaymentRequest[]
  const percent = getProgressPercent(typedOrder.paid_amount, typedOrder.total_amount)
  const remaining = typedOrder.total_amount - typedOrder.paid_amount
  const isCompleted = typedOrder.status === 'completed'
  const timing = getOrderTiming(typedOrder)

  async function deleteOrderAction() {
    'use server'
    await deleteOrder(id, typedOrder.client_id)
    redirect('/admin/orders')
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-8">
      <div className="mb-6">
        <Link href="/admin/orders" className="text-muted-foreground hover:text-foreground text-sm transition-colors">
          ← Órdenes
        </Link>
      </div>

      {/* Order header */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="break-words text-2xl font-semibold tracking-tight text-foreground">{typedOrder.concept}</h1>
              <StatusBadge status={typedOrder.status} />
              {timing.label && <TimingBadge timing={timing.key} label={timing.label} />}
            </div>
            <Link
              href={`/admin/clients/${typedOrder.client_id}`}
              className="text-muted-foreground hover:text-emerald-700 transition-colors text-sm"
            >
              {typedOrder.clients.name}
            </Link>
            {typedOrder.description && (
              <p className="text-muted-foreground text-sm mt-2">{typedOrder.description}</p>
            )}
            <p className="text-muted-foreground text-xs mt-1">
              Emitida {formatDateShort(typedOrder.issued_at ?? typedOrder.created_at)}
              {typedOrder.due_date ? ` · Límite ${formatDateShort(typedOrder.due_date)}` : ''}
            </p>
          </div>
        </div>

        {/* Progress bar — elemento central */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progreso de pago</span>
            <span className="text-foreground tabular-nums font-semibold">{percent}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden" role="progressbar" aria-label="Progreso de pago" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isCompleted ? 'bg-emerald-500' : percent > 0 ? 'bg-emerald-500' : 'bg-muted'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total</p>
            <p className="text-foreground tabular-nums font-semibold">{formatCurrency(typedOrder.total_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Pagado</p>
            <p className="text-emerald-700 tabular-nums font-semibold">{formatCurrency(typedOrder.paid_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Pendiente</p>
            <p className={`tabular-nums font-semibold ${isCompleted ? 'text-emerald-700' : 'text-amber-700'}`}>
              {isCompleted ? '—' : formatCurrency(remaining)}
            </p>
          </div>
        </div>

        {typedOrder.requires_invoice && (
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Subtotal</p>
              <p className="text-foreground tabular-nums font-semibold">{formatCurrency(typedOrder.subtotal_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                IVA {Math.round(typedOrder.tax_rate * 100)}%
              </p>
              <p className="text-foreground tabular-nums font-semibold">{formatCurrency(typedOrder.tax_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Modo factura</p>
              <p className="text-foreground text-sm">
                {typedOrder.tax_mode === 'included' ? 'IVA incluido' : 'IVA agregado'}
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4 text-xs">
          <span className={`rounded-full px-2.5 py-1 font-semibold ${typedOrder.notify_email_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
            Correo {typedOrder.notify_email_enabled ? 'activo' : 'apagado'}
          </span>
          <span className={`rounded-full px-2.5 py-1 font-semibold ${typedOrder.notify_whatsapp_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
            WhatsApp {typedOrder.notify_whatsapp_enabled ? 'activo' : 'apagado'}
          </span>
        </div>
      </div>

      <OrderActionsBar
        orderId={id}
        token={typedOrder.token}
        isCompleted={isCompleted}
        pendingAmount={remaining}
        addPaymentAction={addPaymentAction}
        createStripePaymentRequestAction={createStripePaymentRequestAction}
        sendReminderAction={sendReminderAction.bind(null, id)}
        markCompletedAction={markCompletedAction.bind(null, id)}
        deleteOrderAction={deleteOrderAction}
      />

      <BankInstructionsPanel
        order={typedOrder}
        bankAccounts={typedBankAccounts}
        sendAction={sendBankInstructionsAction.bind(null, id)}
      />

      <StripePaymentRequestsPanel
        requests={typedStripePaymentRequests}
        orderPath={`/p/${typedOrder.token}`}
        cancelAction={cancelStripePaymentRequestAction}
      />

      {/* Payment timeline */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Historial de abonos
          {typedPayments.length > 0 && (
            <span className="text-muted-foreground font-normal text-sm ml-2">({typedPayments.length})</span>
          )}
        </h2>
        <PaymentTimeline
          payments={typedPayments}
          actions={(payment) => (
            <PaymentActions
              payment={payment}
              orderId={id}
              updateAction={updatePaymentAction.bind(null, payment.id)}
              deleteAction={deletePaymentAction.bind(null, payment.id, id)}
              resendReceiptAction={resendPaymentReceiptAction.bind(null, payment.id)}
              canResendReceipt={Boolean(typedOrder.clients.email)}
            />
          )}
        />
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed') {
    return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">Liquidado</Badge>
  }
  if (status === 'partial') {
    return <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30">Parcial</Badge>
  }
  if (status === 'cancelled') {
    return <Badge className="bg-destructive/10 text-destructive border-destructive/30">Cancelado</Badge>
  }
  if (status === 'paused') {
    return <Badge className="bg-muted text-muted-foreground border-border">Pausado</Badge>
  }
  if (status === 'disputed') {
    return <Badge className="bg-destructive/10 text-destructive border-destructive/30">En disputa</Badge>
  }
  return <Badge className="bg-muted text-muted-foreground border-border">{getOrderStatusLabel(status)}</Badge>
}

function TimingBadge({ timing, label }: { timing: string; label: string }) {
  const className = timing === 'overdue'
    ? 'bg-destructive/10 text-destructive border-destructive/30'
    : timing === 'due_today' || timing === 'due_soon'
      ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
      : 'bg-primary/8 text-primary border-primary/20'

  return <Badge className={className}>{label}</Badge>
}
