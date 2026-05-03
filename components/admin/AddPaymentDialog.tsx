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
        <Button className="bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-white font-semibold shadow-sm hover:brightness-105">
          + Agregar abono
        </Button>
      } />
      <DialogContent className="bg-white border-[#E6EAF0] text-[#1A1F36] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1A1F36]">Registrar abono</DialogTitle>
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
