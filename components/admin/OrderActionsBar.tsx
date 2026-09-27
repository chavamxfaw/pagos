'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { CheckCircle2, Edit3, MoreHorizontal, Send } from 'lucide-react'
import { toast } from 'sonner'
import { AddPaymentDialog } from '@/components/admin/AddPaymentDialog'
import { CopyLinkButton } from '@/components/admin/CopyLinkButton'
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog'
import { StripePaymentRequestDialog } from '@/components/admin/StripePaymentRequestDialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type PaymentState = { error?: string; success?: boolean } | null

type ReminderResult = {
  channels?: string[]
} | void

export function OrderActionsBar({
  orderId,
  token,
  isCompleted,
  pendingAmount,
  addPaymentAction,
  createStripePaymentRequestAction,
  sendReminderAction,
  markCompletedAction,
  deleteOrderAction,
}: {
  orderId: string
  token: string
  isCompleted: boolean
  pendingAmount: number
  addPaymentAction: (prevState: PaymentState, formData: FormData) => Promise<PaymentState>
  createStripePaymentRequestAction: (formData: FormData) => Promise<void>
  sendReminderAction: () => Promise<ReminderResult>
  markCompletedAction: () => Promise<void>
  deleteOrderAction: (formData: FormData) => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [pendingReminder, startReminderTransition] = useTransition()
  const [pendingComplete, startCompleteTransition] = useTransition()

  function sendReminder() {
    setOpen(false)
    const toastId = toast.loading('Enviando recordatorio...')

    startReminderTransition(() => {
      void (async () => {
        try {
          const result = await sendReminderAction()
          const channels = result && 'channels' in result ? result.channels ?? [] : []
          toast.success('Recordatorio enviado', {
            id: toastId,
            description: channels.length ? `Canal: ${channels.join(' y ')}` : undefined,
          })
        } catch (error) {
          toast.error('No se pudo enviar el recordatorio', {
            id: toastId,
            description: error instanceof Error ? error.message : 'Revisa los datos del cliente.',
          })
        }
      })()
    })
  }

  function markCompleted() {
    setOpen(false)
    const toastId = toast.loading('Actualizando orden...')

    startCompleteTransition(() => {
      void (async () => {
        try {
          await markCompletedAction()
          toast.success('Orden marcada como completada', { id: toastId })
        } catch (error) {
          toast.error('No se pudo completar la orden', {
            id: toastId,
            description: error instanceof Error ? error.message : 'Inténtalo de nuevo.',
          })
        }
      })()
    })
  }

  return (
    <section className="mb-6 rounded-xl border border-border bg-card p-3 shadow-none">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="grid gap-2 min-[520px]:grid-cols-2 lg:grid-cols-[auto_auto_auto]">
          {!isCompleted && (
            <AddPaymentDialog orderId={orderId} action={addPaymentAction} />
          )}
          {!isCompleted && (
            <StripePaymentRequestDialog
              orderId={orderId}
              pendingAmount={pendingAmount}
              action={createStripePaymentRequestAction}
            />
          )}
          <CopyLinkButton path={`/p/${token}`} label="Copiar link" />
        </div>

        <div className="relative">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen((value) => !value)}
            className="w-full justify-center border-border bg-card text-foreground hover:bg-secondary sm:w-auto"
            aria-expanded={open}
          >
            <MoreHorizontal className="size-4" />
            Más acciones
          </Button>

          {open && (
            <div className="absolute right-0 top-12 z-40 w-64 rounded-xl border border-border bg-card p-2 shadow-lg">
              <Link
                href={`/admin/orders/${orderId}/edit`}
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  'w-full justify-start gap-2 px-3 text-foreground hover:bg-secondary'
                )}
                onClick={() => setOpen(false)}
              >
                <Edit3 className="size-4" />
                Editar orden
              </Link>

              {!isCompleted && (
                <button
                  type="button"
                  onClick={sendReminder}
                  disabled={pendingReminder}
                  className="flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
                >
                  <Send className="size-4 text-primary" />
                  {pendingReminder ? 'Enviando...' : 'Enviar recordatorio'}
                </button>
              )}

              {!isCompleted && (
                <button
                  type="button"
                  onClick={markCompleted}
                  disabled={pendingComplete}
                  className="flex min-h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
                >
                  <CheckCircle2 className="size-4 text-emerald-700" />
                  {pendingComplete ? 'Actualizando...' : 'Marcar completada'}
                </button>
              )}

              <div className="my-1 border-t border-border" />
              <div className="[&_button]:w-full [&_button]:justify-start [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-3 [&_button]:text-sm [&_button]:shadow-none [&_button]:hover:bg-destructive/10">
                <DeleteConfirmDialog
                  action={deleteOrderAction}
                  title="Borrar orden"
                  description="Esto eliminará la orden y todos sus abonos registrados. Esta acción no se puede deshacer."
                  confirmLabel="Borrar orden"
                  triggerLabel="Borrar orden"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
