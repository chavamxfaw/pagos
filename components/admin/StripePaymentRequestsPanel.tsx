'use client'

import { toast } from 'sonner'
import { Clock, CreditCard, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CopyLinkButton } from '@/components/admin/CopyLinkButton'
import { formatCurrency, formatDateShort } from '@/lib/utils'
import type { StripePaymentRequest } from '@/types'

export function StripePaymentRequestsPanel({
  requests,
  orderPath,
  cancelAction,
}: {
  requests: StripePaymentRequest[]
  orderPath: string
  cancelAction: (formData: FormData) => Promise<void>
}) {
  if (!requests.length) return null

  async function onCancel(formData: FormData) {
    try {
      await cancelAction(formData)
      toast.success('Solicitud Stripe cancelada')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cancelar')
    }
  }

  return (
    <section className="mb-6 rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/8 text-primary">
          <CreditCard className="size-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Stripe</p>
          <h2 className="text-lg font-semibold text-foreground">Solicitudes de pago</h2>
        </div>
      </div>

      <div className="grid gap-3">
        {requests.map((request) => (
          <div key={request.id} className="rounded-xl border border-border bg-secondary p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-foreground">{request.concept}</p>
                  <Badge className="border-primary/20 bg-primary/8 text-primary">
                    {request.request_type === 'open' ? 'Monto abierto' : 'Monto fijo'}
                  </Badge>
                  <RequestBadge status={request.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Creada {formatDateShort(request.created_at)}
                  {request.request_type === 'fixed'
                    ? ` · Cargo a cliente ${formatCurrency(request.total_charged)}`
                    : ` · Mínimo ${formatCurrency(request.minimum_amount ?? 0)}`}
                </p>
                {request.requires_invoice && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Factura: {request.tax_mode === 'added' ? 'IVA agregado' : 'IVA incluido'}
                  </p>
                )}
                {request.notes && <p className="mt-2 text-sm text-muted-foreground">{request.notes}</p>}
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <p className="tabular-nums text-lg font-semibold text-foreground">
                  {request.request_type === 'fixed' ? formatCurrency(request.amount ?? 0) : 'Abierto'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Comisión {request.commission_payer === 'customer' ? 'cliente' : 'absorbida'}
                  {request.fee_amount > 0 ? ` · ${formatCurrency(request.fee_amount)}` : ''}
                </p>
              </div>
            </div>

            {request.status === 'pending' && (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <CopyLinkButton path={orderPath} label="Copiar link para pagar" />
                <form action={onCancel}>
                  <input type="hidden" name="request_id" value={request.id} />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="w-full justify-center border-destructive/20 text-xs text-destructive hover:bg-destructive/10 sm:w-auto"
                  >
                    <XCircle className="mr-2 size-4" />
                    Cancelar solicitud
                  </Button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function RequestBadge({ status }: { status: StripePaymentRequest['status'] }) {
  if (status === 'paid') {
    return <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/30">Pagada</Badge>
  }
  if (status === 'cancelled') {
    return <Badge className="bg-destructive/10 text-destructive border-destructive/30">Cancelada</Badge>
  }
  if (status === 'expired') {
    return <Badge className="bg-muted text-muted-foreground border-border">Expirada</Badge>
  }
  return (
    <Badge className="bg-amber-500/10 text-amber-700 border-amber-500/30">
      <Clock className="mr-1 size-3" />
      Pendiente
    </Badge>
  )
}
