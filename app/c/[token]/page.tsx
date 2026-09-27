import { notFound } from 'next/navigation'
import { getPublicClientPortal } from '@/lib/public-clients'
import { formatCurrency, getProgressPercent } from '@/lib/utils'
import { PublicShareActions } from '@/components/public/PublicShareActions'
import { PublicLinkHeader } from '@/components/public/PublicLinkHeader'
import { PublicAccountHero } from '@/components/public/PublicAccountHero'
import { PublicOrdersAccordion } from '@/components/public/PublicOrdersAccordion'
import { getStripeSettings } from '@/lib/stripe/config'

export default async function PublicClientPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const [portal, stripeSettings] = await Promise.all([
    getPublicClientPortal(token),
    getStripeSettings(),
  ])

  if (!portal) notFound()

  const activeOrders = portal.orders.filter((order) => order.status !== 'completed')
  const completedOrders = portal.orders.filter((order) => order.status === 'completed')
  const totalAmount = portal.orders.reduce((sum, order) => sum + order.total_amount, 0)
  const paidAmount = portal.orders.reduce((sum, order) => sum + order.paid_amount, 0)
  const pendingAmount = Math.max(0, totalAmount - paidAmount)
  const percent = getProgressPercent(paidAmount, totalAmount)

  return (
    <div className="min-h-screen bg-background px-3 py-4 sm:px-4 sm:py-6 md:py-8">
      <div className="mx-auto max-w-4xl">
        <PublicLinkHeader />

        <PublicAccountHero
          title={portal.client.name}
          subtitle={portal.client.company}
          totalAmount={totalAmount}
          paidAmount={paidAmount}
          pendingAmount={pendingAmount}
          percent={percent}
        />

        <div className="mb-4 rounded-xl border border-border bg-white p-3 ">
          <PublicShareActions
            title={`Estado de cuenta OTLA - ${portal.client.name}`}
            text={[
              `Estado de cuenta OTLA de ${portal.client.name}`,
              `Total: ${formatCurrency(totalAmount)}`,
              `Pagado: ${formatCurrency(paidAmount)}`,
              `Pendiente: ${formatCurrency(pendingAmount)}`,
              `Progreso: ${percent}%`,
            ].join('\n')}
            label="Compartir resumen"
          />
        </div>

        <PublicOrdersAccordion
          orders={activeOrders}
          title="Pagos pendientes"
          defaultOpenFirst
          stripeSettings={stripeSettings}
        />
        <PublicOrdersAccordion orders={completedOrders} title="Órdenes liquidadas" />

        {!portal.orders.length && (
          <div className="rounded-xl border border-border bg-white p-10 text-center">
            <p className="text-muted-foreground">No hay órdenes registradas todavía.</p>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          OTLA · Tu espacio de trabajo
        </p>
      </div>
    </div>
  )
}
