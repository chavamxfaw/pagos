import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { AddPaymentDialog } from '@/components/admin/AddPaymentDialog'
import { PaymentTimeline } from '@/components/admin/PaymentTimeline'
import { PaymentActions } from '@/components/admin/PaymentActions'
import { BankInstructionsPanel } from '@/components/admin/BankInstructionsPanel'
import { CopyLinkButton } from '@/components/admin/CopyLinkButton'
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog'
import { addPayment, deletePayment, resendPaymentReceipt, updatePayment } from '@/actions/payments'
import { sendBankInstructions } from '@/actions/bank-accounts'
import { deleteOrder, markOrderCompleted } from '@/actions/orders'
import { sendOrderReminder } from '@/actions/reminders'
import { cn, formatCurrency, formatDateShort, getOrderStatusLabel, getOrderTiming, getProgressPercent } from '@/lib/utils'
import type { BankAccount, OrderWithClient, Payment, PaymentMethod } from '@/types'

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
  await sendOrderReminder(orderId)
}

async function sendBankInstructionsAction(orderId: string, formData: FormData) {
  'use server'
  await sendBankInstructions(orderId, formData.get('bank_account_id') as string)
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('orders')
    .select('*, clients(*)')
    .eq('id', id)
    .single()

  if (!order) notFound()

  const { data: payments } = await supabase
    .from('payments')
    .select('*')
    .eq('order_id', id)
    .order('created_at', { ascending: false })

  const { data: bankAccounts } = await supabase
    .from('bank_accounts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  const typedOrder = order as OrderWithClient
  const typedPayments = (payments ?? []) as Payment[]
  const typedBankAccounts = (bankAccounts ?? []) as BankAccount[]
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
        <Link href="/admin/orders" className="text-[#6B7280] hover:text-[#1A1F36] text-sm transition-colors">
          ← Órdenes
        </Link>
      </div>

      {/* Order header */}
      <div className="bg-white border border-[#E6EAF0] rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-[#1A1F36] truncate">{typedOrder.concept}</h1>
              <StatusBadge status={typedOrder.status} />
              {timing.label && <TimingBadge timing={timing.key} label={timing.label} />}
            </div>
            <Link
              href={`/admin/clients/${typedOrder.client_id}`}
              className="text-[#6B7280] hover:text-[#2ED39A] transition-colors text-sm"
            >
              {typedOrder.clients.name}
            </Link>
            {typedOrder.description && (
              <p className="text-[#6B7280] text-sm mt-2">{typedOrder.description}</p>
            )}
            <p className="text-[#8A94A6] text-xs mt-1">
              Emitida {formatDateShort(typedOrder.issued_at ?? typedOrder.created_at)}
              {typedOrder.due_date ? ` · Límite ${formatDateShort(typedOrder.due_date)}` : ''}
            </p>
          </div>
        </div>

        {/* Progress bar — elemento central */}
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[#6B7280]">Progreso de pago</span>
            <span className="text-[#1A1F36] font-mono font-semibold">{percent}%</span>
          </div>
          <div className="h-4 bg-[#E6EAF0] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isCompleted ? 'bg-[#2ED39A]' : percent > 0 ? 'bg-[#2ED39A]' : 'bg-[#D8DEE8]'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-1 gap-4 border-t border-[#E6EAF0] pt-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-[#6B7280] uppercase tracking-wider mb-1">Total</p>
            <p className="text-[#1A1F36] font-mono font-semibold">{formatCurrency(typedOrder.total_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-[#6B7280] uppercase tracking-wider mb-1">Pagado</p>
            <p className="text-[#2ED39A] font-mono font-semibold">{formatCurrency(typedOrder.paid_amount)}</p>
          </div>
          <div>
            <p className="text-xs text-[#6B7280] uppercase tracking-wider mb-1">Pendiente</p>
            <p className={`font-mono font-semibold ${isCompleted ? 'text-[#2ED39A]' : 'text-[#F4B740]'}`}>
              {isCompleted ? '—' : formatCurrency(remaining)}
            </p>
          </div>
        </div>

        {typedOrder.requires_invoice && (
          <div className="mt-4 grid grid-cols-1 gap-4 border-t border-[#E6EAF0] pt-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-[#6B7280] uppercase tracking-wider mb-1">Subtotal</p>
              <p className="text-[#1A1F36] font-mono font-semibold">{formatCurrency(typedOrder.subtotal_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-[#6B7280] uppercase tracking-wider mb-1">
                IVA {Math.round(typedOrder.tax_rate * 100)}%
              </p>
              <p className="text-[#1A1F36] font-mono font-semibold">{formatCurrency(typedOrder.tax_amount)}</p>
            </div>
            <div>
              <p className="text-xs text-[#6B7280] uppercase tracking-wider mb-1">Modo factura</p>
              <p className="text-[#1A1F36] text-sm">
                {typedOrder.tax_mode === 'included' ? 'IVA incluido' : 'IVA agregado'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mb-6 grid grid-cols-1 gap-3 min-[430px]:grid-cols-2 sm:flex sm:flex-wrap sm:items-center">
        {!isCompleted && (
          <AddPaymentDialog orderId={id} action={addPaymentAction} />
        )}
        <Link
          href={`/admin/orders/${id}/edit`}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'w-full justify-center border-[#D8DEE8] text-xs text-[#1A1F36] hover:bg-[#E6EAF0] sm:w-auto'
          )}
        >
          Editar orden
        </Link>
        <CopyLinkButton path={`/p/${typedOrder.token}`} label="Copiar link de orden" />
        {!isCompleted && (
          <form action={sendReminderAction.bind(null, id)}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full justify-center border-[#D8DEE8] text-xs text-[#1A1F36] hover:bg-[#E6EAF0] sm:w-auto"
            >
              Enviar recordatorio
            </Button>
          </form>
        )}
        {!isCompleted && (
          <form action={markCompletedAction.bind(null, id)}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full justify-center border-[#D8DEE8] text-xs text-[#6B7280] hover:bg-[#E6EAF0] hover:text-[#1A1F36] sm:w-auto"
            >
              Marcar como completado
            </Button>
          </form>
        )}
        <DeleteConfirmDialog
          action={deleteOrderAction}
          title="Borrar orden"
          description="Esto eliminará la orden y todos sus abonos registrados. Esta acción no se puede deshacer."
          confirmLabel="Borrar orden"
          triggerLabel="Borrar"
        />
      </div>

      <BankInstructionsPanel
        order={typedOrder}
        bankAccounts={typedBankAccounts}
        sendAction={sendBankInstructionsAction.bind(null, id)}
      />

      {/* Payment timeline */}
      <div>
        <h2 className="text-lg font-semibold text-[#1A1F36] mb-4">
          Historial de abonos
          {typedPayments.length > 0 && (
            <span className="text-[#6B7280] font-normal text-sm ml-2">({typedPayments.length})</span>
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
    return <Badge className="bg-[#2ED39A]/10 text-[#2ED39A] border-[#2ED39A]/30">Liquidado</Badge>
  }
  if (status === 'partial') {
    return <Badge className="bg-[#F4B740]/10 text-[#F4B740] border-[#F4B740]/30">Parcial</Badge>
  }
  if (status === 'cancelled') {
    return <Badge className="bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30">Cancelado</Badge>
  }
  if (status === 'paused') {
    return <Badge className="bg-[#E6EAF0] text-[#6B7280] border-[#D8DEE8]">Pausado</Badge>
  }
  if (status === 'disputed') {
    return <Badge className="bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30">En disputa</Badge>
  }
  return <Badge className="bg-[#E6EAF0] text-[#6B7280] border-[#D8DEE8]">{getOrderStatusLabel(status)}</Badge>
}

function TimingBadge({ timing, label }: { timing: string; label: string }) {
  const className = timing === 'overdue'
    ? 'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'
    : timing === 'due_today' || timing === 'due_soon'
      ? 'bg-[#F4B740]/10 text-[#F4B740] border-[#F4B740]/30'
      : 'bg-[#EEF2FF] text-[#4A8BFF] border-[#4A8BFF]/20'

  return <Badge className={className}>{label}</Badge>
}
