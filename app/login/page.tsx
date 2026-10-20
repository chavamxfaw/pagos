'use client'
import Image from 'next/image'
import Link from 'next/link'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('No pudimos iniciar sesión. Revisa tu correo y contraseña.')
      } else {
        router.push('/admin')
        router.refresh()
      }
    } catch {
      setError('No pudimos conectarnos. Intenta de nuevo en unos momentos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="otla-login mx-auto grid min-h-dvh max-w-[1600px] gap-6 bg-card p-4 lg:grid-cols-2 lg:p-8">
      <section aria-labelledby="login-title" className="flex min-w-0 flex-col justify-center px-6 py-10 sm:px-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-9">
          <Image src="/otla-logo-v2.png" alt="OTLA" width={1408} height={1117} sizes="96px" className="mb-8 h-auto w-24" priority />
          <h1 id="login-title" className="text-3xl font-semibold tracking-tight text-foreground">Bienvenido de nuevo</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">Entra a OTLA y mantén tus cobros al día.</p>
        </div>

        <form onSubmit={handleSubmit} aria-busy={loading} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="text-foreground">Correo electrónico</Label>
            <Input
              id="email"
              autoComplete="username"
              disabled={loading}
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="min-h-11 border-input bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="text-foreground">Contraseña</Label>
            <Input
              id="password"
              autoComplete="current-password"
              disabled={loading}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="min-h-11 border-input bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {error && <p role="alert" className="text-destructive text-sm">{error}</p>}

          <Button
            type="submit"
            disabled={loading || !email || !password}
            className="mt-2 min-h-11 w-full"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
        <nav aria-label="Información legal" className="mt-8 flex flex-wrap gap-x-5 text-xs text-muted-foreground">
          <Link href="/privacidad" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">Privacidad</Link>
          <Link href="/condiciones" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">Condiciones</Link>
        </nav>
      </div>
      </section>
      <section aria-label="Tus pagos en orden" className="otla-login-art hidden flex-col items-center justify-center rounded-xl px-8 py-10 lg:flex">
        <Image src="/otla-payments-illustration.png" alt="Ilustración de una persona organizando cobros, un comprobante y fechas de pago." width={1254} height={1254} sizes="(min-width: 1280px) 600px, 45vw" className="h-auto w-full max-w-xl rounded-xl" priority />
        <div className="max-w-sm text-center">
          <h2 className="text-2xl font-semibold tracking-tight">Tus cobros, en orden.<br />Tu tiempo, para ti.</h2>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">Enlaces de pago, abonos y recordatorios. Todo lo necesario para dar seguimiento a tus clientes.</p>
        </div>
      </section>
    </main>
  )
}
