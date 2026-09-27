'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Edit3, Mail, ReceiptText, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PaymentForm } from '@/components/admin/PaymentForm'
import type { Payment } from '@/types'

type State = { error?: string; success?: boolean } | null

export function PaymentActions({
  payment,
  orderId,
  updateAction,
  deleteAction,
  resendReceiptAction,
  canResendReceipt,
}: {
  payment: Payment
  orderId: string
  updateAction: (prevState: State, formData: FormData) => Promise<State>
  deleteAction: (formData: FormData) => Promise<void>
  resendReceiptAction: (formData: FormData) => Promise<void>
  canResendReceipt: boolean
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [receiptState, resend, resending] = useActionState(async (_previous: State, formData: FormData): Promise<State> => {
    try { await resendReceiptAction(formData); return { success: true } }
    catch { return { error: 'No se pudo reenviar el recibo. Revisa la configuración de correo.' } }
  }, null)
  const [deleteState, remove, deleting] = useActionState(async (_previous: State, formData: FormData): Promise<State> => {
    try { await deleteAction(formData); setDeleteOpen(false); return { success: true } }
    catch { return { error: 'No se pudo eliminar el abono. Inténtalo nuevamente.' } }
  }, null)

  return (
    <div><div className="flex flex-wrap items-center gap-1">
      {payment.receipt_token && (
        <Button
          nativeButton={false}
          render={
            <Link
              href={`/r/${payment.receipt_token}`}
              target="_blank"
              rel="noreferrer"
            />
          }
          variant="outline"
          size="icon"
          className="size-10 sm:size-8 border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Ver recibo"
          title="Ver recibo"
        >
          <ReceiptText className="size-3.5" />
        </Button>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 sm:size-8 border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Editar abono"
            >
              <Edit3 className="size-3.5" />
            </Button>
          }
        />
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Editar abono</DialogTitle>
          </DialogHeader>
          <PaymentForm
            action={updateAction}
            orderId={orderId}
            defaultValues={payment}
            submitLabel="Guardar abono"
            onSuccess={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <form action={resend}>
        <Button
          type="submit"
          variant="outline"
          size="icon"
          disabled={!canResendReceipt || resending}
          className="size-10 sm:size-8 border-border text-muted-foreground hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
          aria-label={resending ? 'Enviando recibo' : canResendReceipt ? 'Reenviar recibo' : 'Reenvío por correo no disponible'}
          title={resending ? 'Enviando recibo' : canResendReceipt ? 'Reenviar recibo' : 'Reenvío por correo no disponible'}
        >
          <Mail className="size-3.5" />
        </Button>
      </form>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 sm:size-8 border-destructive/20 text-destructive hover:bg-destructive/10"
              aria-label="Eliminar abono"
            >
              <Trash2 className="size-3.5" />
            </Button>
          }
        />
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Eliminar abono</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Esto quitará el abono y recalculará el saldo de la orden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-border bg-card">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancelar
            </DialogClose>
            <form action={remove}>
              <Button type="submit" variant="destructive" disabled={deleting} className="w-full bg-destructive/10 text-destructive hover:bg-destructive/20 sm:w-auto">
                {deleting ? 'Eliminando…' : 'Eliminar abono'}
              </Button>
              {deleteState?.error && <p role="alert" className="mt-2 text-sm text-destructive">{deleteState.error}</p>}
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>{receiptState?.error && <p role="alert" className="mt-2 max-w-xs text-xs text-destructive">{receiptState.error}</p>}{receiptState?.success && <p role="status" className="mt-2 text-xs text-emerald-700">Recibo reenviado.</p>}</div>
  )
}
