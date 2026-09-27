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
        <Button className="w-full justify-center bg-primary text-primary-foreground font-semibold shadow-none hover:bg-primary/90 sm:w-auto">
          + Agregar abono
        </Button>
      } />
      <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Registrar abono</DialogTitle>
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
