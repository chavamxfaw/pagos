'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { PaymentForm } from './PaymentForm'

type State = { error?: string; success?: boolean } | null

export function AddPaymentDialog({
  orderId,
  action,
}: {
  orderId: string
  action: (prevState: State, formData: FormData) => Promise<State>
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold">
          + Agregar abono
        </Button>
      } />
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-50">Registrar abono</DialogTitle>
        </DialogHeader>
        <PaymentForm
          action={action}
          orderId={orderId}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
