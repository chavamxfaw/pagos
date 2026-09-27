import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { getPublicOrder } from '@/lib/public-orders'
import { formatCurrency, getProgressPercent } from '@/lib/utils'
import { PublicShareActions } from '@/components/public/PublicShareActions'
import { PublicLinkHeader } from '@/components/public/PublicLinkHeader'
import { PublicAccountHero } from '@/components/public/PublicAccountHero'
import { PublicOrdersAccordion } from '@/components/public/PublicOrdersAccordion'
import { getStripeSettings } from '@/lib/stripe/config'

export default async function PublicOrderPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const [publicOrder, stripeSettings] = await Promise.all([
    getPublicOrder(token),
    getStripeSettings(),
  ])

  if (!publicOrder) notFound()

  const { order, payments: typedPayments, stripePaymentRequests, bankAccount, fiscalDocument } = publicOrder
  const percent = getProgressPercent(order.paid_amount, order.total_amount)
  const remaining = Math.max(0, order.total_amount - order.paid_amount)
  const isCompleted = order.status === 'completed'
  const clientPortalPath = order.clients.client_portal_enabled
    ? `/c/${order.clients.client_portal_token}`
    : null
  const accordionOrder = {
    ...order,
    bank_accounts: bankAccount,
    fiscal_documents: fiscalDocument,
    payments: typedPayments,
    stripe_payment_requests: stripePaymentRequests,
  }

  return (
    <div className="min-h-screen bg-background px-3 py-4 sm:px-4 sm:py-6 md:py-8">
      <div className="mx-auto max-w-4xl">
        <PublicLinkHeader />

        {clientPortalPath && (
          <div className="mb-4">
            <Link
              href={clientPortalPath}
              className="inline-flex min-h-11 max-w-full items-center justify-center gap-2 rounded-full border border-border bg-white px-4 text-center text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-[#C8D0DC] hover:bg-muted/40"
            >
              <ArrowLeft className="size-4" />
              Volver al resumen general
            </Link>
          </div>
        )}

        <PublicAccountHero
          title={order.clients.name}
          subtitle={order.concept}
          totalAmount={order.total_amount}
          paidAmount={order.paid_amount}
          pendingAmount={remaining}
          percent={percent}
        />

        <div className="mb-4 rounded-xl border border-border bg-white p-3 ">
          <PublicShareActions
            title={`Estado de cuenta OTLA - ${order.concept}`}
            text={[
              `Estado de cuenta OTLA de ${order.clients.name}`,
              `Orden: ${order.concept}`,
              `Total: ${formatCurrency(order.total_amount)}`,
              `Pagado: ${formatCurrency(order.paid_amount)}`,
              isCompleted ? 'Estado: Liquidado' : `Pendiente: ${formatCurrency(remaining)}`,
              `Progreso: ${percent}%`,
            ].join('\n')}
          />
        </div>

        {isCompleted && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center shadow-sm">
            <CheckCircle2 className="mx-auto mb-2 size-8 text-emerald-700" />
            <h2 className="text-lg font-semibold text-emerald-700">Pago completado</h2>
            <p className="mt-1 text-sm text-emerald-700/75">
              Gracias {order.clients.name}, tu saldo está liquidado.
            </p>
          </div>
        )}

        <PublicOrdersAccordion
          orders={[accordionOrder]}
          title="Detalle de la orden"
          showDetailLinks={false}
          defaultOpenFirst
          stripeSettings={stripeSettings}
        />

        <p className="text-center text-muted-foreground text-xs mt-8">
          OTLA · Tu espacio de trabajo
        </p>
      </div>
    </div>
  )
}
