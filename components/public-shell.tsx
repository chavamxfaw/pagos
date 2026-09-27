import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

export const publicLink = 'inline-flex min-h-11 items-center rounded-md text-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary'

export function PublicShell({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-background text-foreground">
    <a href="#contenido" className="sr-only focus:not-sr-only focus:block focus:p-4">Ir al contenido</a>
    <header className="border-b border-border bg-card">
      <nav aria-label="Navegación pública" className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link href="/" aria-label="OTLA, inicio" className="rounded-md"><Image src="/otla-logo-v2.png" alt="OTLA" width={1408} height={1117} className="h-auto w-20" priority /></Link>
        <Link href="/login" prefetch={false} className={publicLink}>Entrar a mi espacio <span aria-hidden="true" className="ml-2">→</span></Link>
      </nav>
    </header>
    <main id="contenido" className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">{children}</main>
    <footer className="border-t border-border"><div className="mx-auto flex max-w-5xl flex-col gap-3 px-5 py-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-8">
      <p className="text-sm text-muted-foreground">OTLA · Un espacio para tu trabajo.</p>
      <nav aria-label="Información y contacto" className="flex flex-wrap gap-x-5 gap-y-1">
        <Link className={publicLink} href="/privacidad">Privacidad</Link>
        <Link className={publicLink} href="/condiciones">Condiciones</Link>
        <a className={publicLink} href="mailto:buenas@chavacervantes.dev">Contacto</a>
      </nav>
    </div></footer>
  </div>
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="space-y-3 border-t border-border pt-6">
    <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
    <div className="space-y-3 text-sm leading-7 text-muted-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">{children}</div>
  </section>
}
