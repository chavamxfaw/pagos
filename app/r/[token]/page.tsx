import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { CheckCircle2, ExternalLink, ReceiptText } from 'lucide-react'
import { ReceiptActions } from '@/components/public/ReceiptActions'
import { getPublicPaymentReceipt } from '@/lib/payment-receipts'
import { formatCurrency, formatDate, formatDateShort, getPaymentMethodLabel } from '@/lib/utils'

export default async function PublicPaymentReceiptPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const receipt = await getPublicPaymentReceipt(token)

  if (!receipt) notFound()

  const { payment, order } = receipt
  const remaining = Math.max(0, order.total_amount - order.paid_amount)
  const isCompleted = order.status === 'completed'
  const receiptText = [
    `Cliente: ${order.clients.name}`,
    `Orden: ${order.concept}`,
    `Abono: ${formatCurrency(payment.amount)}`,
    `Fecha: ${formatReceiptDate(payment.paid_at ?? payment.created_at)}`,
    `Metodo: ${getPaymentMethodLabel(payment.payment_method)}`,
    payment.payment_reference ? `Referencia: ${payment.payment_reference}` : '',
    `Total de la orden: ${formatCurrency(order.total_amount)}`,
    `Pagado actual: ${formatCurrency(order.paid_amount)}`,
    isCompleted ? 'Estado: Liquidado' : `Pendiente actual: ${formatCurrency(remaining)}`,
  ].filter(Boolean).join('\n')

  return (
    <main className="min-h-screen bg-[#F5F7FB] px-3 py-5 text-[#1A1F36] print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-center justify-between gap-4 print:hidden">
          <Image src="/otla-logo.png" alt="OTLA" width={96} height={48} className="h-12 w-auto" />
          <span className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[#EAFBF5] px-3 text-xs font-semibold text-[#129B70]">
            <CheckCircle2 className="size-4" />
            Recibo verificado
          </span>
        </div>

        <section className="overflow-hidden rounded-3xl border border-[#E6EAF0] bg-white shadow-[0_18px_50px_rgba(26,31,54,0.06)] print:rounded-none print:border-0 print:shadow-none">
          <div className="bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] px-6 py-8 text-white sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/70">
                  Recibo de abono
                </p>
                <h1 className="text-3xl font-bold">{order.clients.name}</h1>
                <p className="mt-2 text-sm text-white/75">{order.concept}</p>
              </div>
              <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                <ReceiptText className="size-7" />
              </span>
            </div>

            <div className="mt-8 grid overflow-hidden rounded-2xl border border-white/20 sm:grid-cols-3">
              <ReceiptMetric label="Abono" value={formatCurrency(payment.amount)} />
              <ReceiptMetric label="Pagado actual" value={formatCurrency(order.paid_amount)} />
              <ReceiptMetric label={isCompleted ? 'Estado' : 'Pendiente'} value={isCompleted ? 'Liquidado' : formatCurrency(remaining)} />
            </div>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            <ReceiptActions
              title={`Recibo OTLA - ${order.concept}`}
              text={receiptText}
            />

            <div className="grid gap-4 rounded-2xl border border-[#E6EAF0] bg-[#F8FAFF] p-4 sm:grid-cols-2">
              <Detail label="Fecha del abono" value={formatReceiptDate(payment.paid_at ?? payment.created_at)} />
              <Detail label="Fecha de emisión" value={formatDate(payment.receipt_issued_at ?? payment.created_at)} />
              <Detail label="Método" value={getPaymentMethodLabel(payment.payment_method)} />
              <Detail label="Referencia" value={payment.payment_reference || 'Sin referencia'} />
              <Detail label="Concepto del abono" value={payment.concept} />
              <Detail label="Folio" value={payment.receipt_token} mono />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <BalanceCard label="Total orden" value={formatCurrency(order.total_amount)} />
              <BalanceCard label="Pagado" value={formatCurrency(order.paid_amount)} tone="paid" />
              <BalanceCard label="Restante" value={isCompleted ? 'Liquidado' : formatCurrency(remaining)} tone={isCompleted ? 'paid' : 'pending'} />
            </div>

            {order.requires_invoice && (
              <div className="rounded-2xl border border-[#E6EAF0] bg-white p-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6C5CE7]">Desglose fiscal</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <BalanceCard label="Subtotal" value={formatCurrency(order.subtotal_amount)} />
                  <BalanceCard label={`IVA ${Math.round(order.tax_rate * 100)}%`} value={formatCurrency(order.tax_amount)} />
                  <BalanceCard label="Total" value={formatCurrency(order.total_amount)} />
                </div>
                <p className="mt-3 text-xs text-[#6B7280]">
                  {order.tax_mode === 'included' ? 'El monto capturado ya incluye IVA.' : 'El IVA fue agregado al subtotal capturado.'}
                </p>
              </div>
            )}

            {payment.notes && (
              <div className="rounded-2xl border border-[#E6EAF0] bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A94A6]">Notas</p>
                <p className="mt-2 text-sm text-[#1A1F36]">{payment.notes}</p>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-[#E6EAF0] pt-5 text-sm text-[#6B7280] sm:flex-row sm:items-center sm:justify-between">
              <span>OTLA · Control de pagos · {formatDateShort(payment.created_at)}</span>
              <Link
                href={`/p/${order.token}`}
                className="print:hidden inline-flex min-h-10 items-center gap-2 font-semibold text-[#4A8BFF] hover:text-[#6C5CE7]"
              >
                Ver estado de cuenta
                <ExternalLink className="size-4" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}

function ReceiptMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-white/20 px-4 py-4 first:border-0 sm:border-l">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/65">{label}</p>
      <p className="mt-2 font-mono text-lg font-bold text-white">{value}</p>
    </div>
  )
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A94A6]">{label}</p>
      <p className={`mt-1 break-words text-sm font-semibold text-[#1A1F36] ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  )
}

function BalanceCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'paid' | 'pending'
}) {
  return (
    <div className="rounded-2xl border border-[#E6EAF0] bg-[#F8FAFF] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8A94A6]">{label}</p>
      <p className={`mt-2 font-mono text-base font-bold ${tone === 'paid' ? 'text-[#2ED39A]' : tone === 'pending' ? 'text-[#F4B740]' : 'text-[#1A1F36]'}`}>
        {value}
      </p>
    </div>
  )
}

function formatReceiptDate(date: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return formatDateShort(date)
  }

  return formatDate(date)
}
