import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ExternalLink, ReceiptText } from 'lucide-react'
import { PublicLinkHeader } from '@/components/public/PublicLinkHeader'
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
    <main className="min-h-screen bg-background px-3 py-5 text-foreground print:bg-white print:px-0 print:py-0">
      <div className="mx-auto max-w-3xl">
        <div className="print:hidden"><PublicLinkHeader /></div>

        <section className="overflow-hidden rounded-xl border border-border bg-white  print:rounded-none print:border-0 print:shadow-none">
          <div className="border-b border-border bg-secondary/40 px-5 py-6 text-foreground sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="mb-2 text-sm font-medium text-primary">
                  Recibo de abono
                </p>
                <h1 className="break-words text-2xl font-semibold tracking-tight">{order.clients.name}</h1>
                <p className="mt-2 break-words text-sm text-muted-foreground">{order.concept}</p>
              </div>
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                <ReceiptText className="size-5" />
              </span>
            </div>

            <div className="mt-6 grid overflow-hidden rounded-xl border border-border bg-white sm:grid-cols-3">
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

            <div className="grid gap-4 rounded-xl border border-border bg-muted/40 p-4 sm:grid-cols-2">
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
              <div className="rounded-xl border border-border bg-white p-4">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Desglose fiscal</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  <BalanceCard label="Subtotal" value={formatCurrency(order.subtotal_amount)} />
                  <BalanceCard label={`IVA ${Math.round(order.tax_rate * 100)}%`} value={formatCurrency(order.tax_amount)} />
                  <BalanceCard label="Total" value={formatCurrency(order.total_amount)} />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  {order.tax_mode === 'included' ? 'El monto capturado ya incluye IVA.' : 'El IVA fue agregado al subtotal capturado.'}
                </p>
              </div>
            )}

            {payment.notes && (
              <div className="rounded-xl border border-border bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Notas</p>
                <p className="mt-2 text-sm text-foreground">{payment.notes}</p>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-border pt-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>OTLA · Tu espacio de trabajo · {formatDateShort(payment.created_at)}</span>
              <Link
                href={`/p/${order.token}`}
                className="print:hidden inline-flex min-h-10 items-center gap-2 font-semibold text-primary hover:text-primary"
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
    <div className="border-border px-4 py-4 not-last:border-b sm:not-last:border-b-0 sm:not-last:border-r">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold tabular-nums text-primary">{value}</p>
    </div>
  )
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className={`mt-1 break-words text-sm font-semibold text-foreground ${mono ? 'font-mono' : ''}`}>{value}</p>
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
    <div className="rounded-xl border border-border bg-muted/40 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <p className={`mt-2 font-mono text-base font-semibold ${tone === 'paid' ? 'text-emerald-700' : tone === 'pending' ? 'text-amber-700' : 'text-foreground'}`}>
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
