'use client'

import { Button } from '@/components/ui/button'

export default function ContactsError({ reset }: { reset: () => void }) {
  return <div role="alert" className="mx-auto max-w-xl p-8"><h1 className="text-xl font-semibold">No se pudo cargar el contacto</h1><p className="mt-3 text-sm text-muted-foreground">No pudimos consultar el historial completo. Reintenta para recuperar la información.</p><Button onClick={reset} className="mt-5">Reintentar</Button></div>
}
