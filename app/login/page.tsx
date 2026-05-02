'use client'

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

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Credenciales incorrectas')
    } else {
      router.push('/admin')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-heading font-bold text-zinc-50 tracking-widest uppercase mb-1">CHCV</h1>
          <p className="text-sm text-zinc-500">Panel de administración</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-zinc-900 border-zinc-800 text-zinc-50 placeholder:text-zinc-600"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-300">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-zinc-900 border-zinc-800 text-zinc-50 placeholder:text-zinc-600"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <Button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

      </div>
    </div>
  )
}
