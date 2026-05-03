'use client'

import { useState } from 'react'
import { Edit3, Mail, Trash2 } from 'lucide-react'
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

  return (
    <div className="flex items-center gap-1">
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 border-[#E6EAF0] text-[#6B7280] hover:bg-[#F8FAFF] hover:text-[#1A1F36]"
              aria-label="Editar abono"
            >
              <Edit3 className="size-3.5" />
            </Button>
          }
        />
        <DialogContent className="bg-white border-[#E6EAF0] text-[#1A1F36] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1A1F36]">Editar abono</DialogTitle>
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

      <form action={resendReceiptAction}>
        <Button
          type="submit"
          variant="outline"
          size="icon"
          disabled={!canResendReceipt}
          className="size-8 border-[#E6EAF0] text-[#6B7280] hover:bg-[#F8FAFF] hover:text-[#1A1F36] disabled:cursor-not-allowed disabled:opacity-35"
          aria-label={canResendReceipt ? 'Reenviar recibo' : 'Cliente sin correo'}
          title={canResendReceipt ? 'Reenviar recibo' : 'Cliente sin correo'}
        >
          <Mail className="size-3.5" />
        </Button>
      </form>

      <Dialog>
        <DialogTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8 border-[#FAD1D1] text-[#EF4444] hover:bg-[#EF4444]/10"
              aria-label="Eliminar abono"
            >
              <Trash2 className="size-3.5" />
            </Button>
          }
        />
        <DialogContent className="bg-white border-[#E6EAF0] text-[#1A1F36] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1A1F36]">Eliminar abono</DialogTitle>
            <DialogDescription className="text-[#6B7280]">
              Esto quitará el abono y recalculará el saldo de la orden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-[#E6EAF0] bg-white/90">
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancelar
            </DialogClose>
            <form action={deleteAction}>
              <Button type="submit" variant="destructive" className="w-full bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 sm:w-auto">
                Eliminar abono
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
