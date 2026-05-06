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
    <section className="mb-6 rounded-xl border border-[#E6EAF0] bg-white p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6C5CE7]">
          <CreditCard className="size-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6C5CE7]">Stripe</p>
          <h2 className="text-lg font-semibold text-[#1A1F36]">Solicitudes de pago</h2>
        </div>
      </div>

      <div className="grid gap-3">
        {requests.map((request) => (
          <div key={request.id} className="rounded-xl border border-[#E6EAF0] bg-[#F8FAFF] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-[#1A1F36]">{request.concept}</p>
                  <RequestBadge status={request.status} />
                </div>
                <p className="mt-1 text-sm text-[#6B7280]">
                  Creada {formatDateShort(request.created_at)} · Cargo a cliente {formatCurrency(request.total_charged)}
                </p>
                {request.requires_invoice && (
                  <p className="mt-1 text-xs text-[#6B7280]">
                    Factura: {request.tax_mode === 'added' ? 'IVA agregado' : 'IVA incluido'}
                  </p>
                )}
                {request.notes && <p className="mt-2 text-sm text-[#6B7280]">{request.notes}</p>}
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <p className="font-mono text-lg font-bold text-[#1A1F36]">{formatCurrency(request.amount)}</p>
                <p className="text-xs text-[#6B7280]">
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
                    className="w-full justify-center border-[#FAD1D1] text-xs text-[#EF4444] hover:bg-[#EF4444]/10 sm:w-auto"
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
    return <Badge className="bg-[#2ED39A]/10 text-[#129B70] border-[#2ED39A]/30">Pagada</Badge>
  }
  if (status === 'cancelled') {
    return <Badge className="bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30">Cancelada</Badge>
  }
  if (status === 'expired') {
    return <Badge className="bg-[#E6EAF0] text-[#6B7280] border-[#D8DEE8]">Expirada</Badge>
  }
  return (
    <Badge className="bg-[#F4B740]/10 text-[#B77900] border-[#F4B740]/30">
      <Clock className="mr-1 size-3" />
      Pendiente
    </Badge>
  )
}
