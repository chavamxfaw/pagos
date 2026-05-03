'use client'

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
import { Trash2 } from 'lucide-react'
import { useFormStatus } from 'react-dom'

export function DeleteConfirmDialog({
  action,
  title,
  description,
  confirmLabel = 'Borrar',
  triggerLabel = 'Borrar',
}: {
  action: (formData: FormData) => void | Promise<void>
  title: string
  description: string
  confirmLabel?: string
  triggerLabel?: string
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="w-full justify-center border-red-500/20 text-[#EF4444] hover:bg-[#EF4444]/10 hover:text-red-300 sm:w-auto"
          >
            <Trash2 />
            {triggerLabel}
          </Button>
        }
      />
      <DialogContent className="bg-white border-[#E6EAF0] text-[#1A1F36] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#1A1F36]">{title}</DialogTitle>
          <DialogDescription className="text-[#6B7280]">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-[#E6EAF0] bg-white/90">
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancelar
          </DialogClose>
          <form action={action}>
            <DeleteSubmitButton label={confirmLabel} />
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteSubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      variant="destructive"
      disabled={pending}
      className="w-full sm:w-auto bg-[#EF4444]/10 text-[#EF4444] hover:bg-[#EF4444]/20 hover:text-red-300"
    >
      {pending ? 'Borrando...' : label}
    </Button>
  )
}
