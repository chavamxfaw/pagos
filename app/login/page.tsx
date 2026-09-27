'use client'
import Image from 'next/image'

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
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 sm:p-8">
        <div className="mb-8 text-center">
          <Image src="/otla-logo-v2.png" alt="OTLA" width={1408} height={1117} className="mx-auto mb-4 h-auto w-36" priority />
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Bienvenido a OTLA</h1>
          <p className="mt-2 text-sm text-muted-foreground">Tu negocio, en un solo lugar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Correo electrónico</Label>
            <Input
              id="email"
              autoComplete="username"
              disabled={loading}
              type="email"
              placeholder="admin@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="min-h-11 border-input bg-background text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
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
            className="min-h-11 w-full bg-primary text-white font-semibold shadow-sm hover:bg-primary/90"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

      </div>
    </div>
  )
}
