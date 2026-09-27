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
import { useActionState, useState } from 'react'
import { isRedirectError } from 'next/dist/client/components/redirect-error'

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
  const [open, setOpen] = useState(false)
  const [error, submit] = useActionState(async (_previous: string | null, formData: FormData): Promise<string | null> => {
    try {
      await action(formData)
      setOpen(false)
      return null
    } catch (failure) {
      if (isRedirectError(failure)) throw failure
      return 'No se pudo eliminar. Revisa si tiene registros asociados e inténtalo de nuevo.'
    }
  }, null)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="w-full justify-center border-red-500/20 text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
          >
            <Trash2 />
            {triggerLabel}
          </Button>
        }
      />
      <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">{title}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="border-border bg-card">
          <DialogClose render={<Button type="button" variant="outline" />}>
            Cancelar
          </DialogClose>
          <form action={submit}>
            <DeleteSubmitButton label={confirmLabel} />
            {error && <p role="alert" className="mt-2 max-w-xs text-sm text-destructive">{error}</p>}
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
      className="w-full sm:w-auto bg-destructive/10 text-destructive hover:bg-destructive/20 hover:text-destructive"
    >
      {pending ? 'Borrando...' : label}
    </Button>
  )
}
