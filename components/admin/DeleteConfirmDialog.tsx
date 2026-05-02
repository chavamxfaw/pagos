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
            className="border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          >
            <Trash2 />
            {triggerLabel}
          </Button>
        }
      />
      <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-50">{title}</DialogTitle>
          <DialogDescription className="text-zinc-400">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-zinc-800 bg-zinc-950/80">
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
      className="w-full sm:w-auto bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300"
    >
      {pending ? 'Borrando...' : label}
    </Button>
  )
}
