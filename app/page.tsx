import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell, publicLink } from '@/components/public-shell'

export const metadata: Metadata = { title: 'OTLA · Contactos, agenda y pagos', description: 'Un espacio de trabajo para organizar contactos, proyectos, citas y seguimiento de pagos.' }

export default function Home() {
  return <PublicShell>
    <section className="max-w-2xl space-y-6">
      <p className="text-sm font-medium text-primary">OTLA · Tu espacio de trabajo</p>
      <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">Tus relaciones, tu agenda.<br />Todo en su lugar.</h1>
      <p className="max-w-xl text-base leading-8 text-muted-foreground">Organiza contactos y proyectos, consulta el seguimiento de pagos y coordina citas desde un mismo espacio. Una plataforma de Chava Cervantes para dar continuidad a cada cliente.</p>
      <Link href="/login" prefetch={false} className="inline-flex min-h-11 items-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90">Entrar a OTLA</Link>
    </section>
    <section aria-label="Qué puedes organizar" className="mt-12 grid gap-8 border-t border-border pt-8 sm:grid-cols-3">
      {[
        ['Contactos y proyectos', 'Conserva el contexto de cada relación: datos de contacto, oportunidades, tareas y proyectos.'],
        ['Agenda y reservas', 'La integración con Google Calendar permite elegir calendarios para comprobar disponibilidad y un destino para tus citas.'],
        ['Pagos y comunicación', 'Comparte enlaces de pago, consulta abonos y envía comunicaciones relacionadas con tus servicios por los canales configurados.'],
      ].map(([title, text]) => <div key={title}><h2 className="text-base font-semibold">{title}</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">{text}</p></div>)}
    </section>
    <section className="mt-10 rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Tú decides qué cuenta conectar.</h2>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">Google Calendar requiere tu autorización. OTLA utiliza la lista de calendarios, los intervalos ocupados y los eventos necesarios para gestionar reservas. No solicita acceso a Gmail, Drive ni a tu contraseña de Google.</p>
      <Link href="/privacidad#google" className={`${publicLink} mt-2 text-primary`}>Cómo se utilizan los datos de Google</Link>
    </section>
  </PublicShell>
}
