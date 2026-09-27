import { LockKeyhole } from 'lucide-react'
import Image from 'next/image'

export function PublicLinkHeader() {
  return (
    <header className="mb-5 flex items-center justify-between gap-3">
      <div className="flex min-h-12 min-w-0 items-center gap-3">
        <Image src="/otla-logo-v2.png" alt="OTLA" width={1408} height={1117} className="h-16 w-auto object-contain" priority />
        <p className="text-xs text-muted-foreground">Portal de clientes</p>
      </div>

      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <LockKeyhole className="size-3.5" />
        Enlace privado
      </span>
    </header>
  )
}
