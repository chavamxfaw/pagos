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
    <div className="min-h-screen flex items-center justify-center bg-[#F5F7FB] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[#E6EAF0] bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <Image src="/otla-logo.png" alt="OTLA" width={160} height={127} className="mx-auto mb-4 h-24 w-auto object-contain" priority />
          <p className="text-sm text-[#6B7280]">Panel de administración</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#1A1F36]">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white border-[#E6EAF0] text-[#1A1F36] placeholder:text-[#8A94A6]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-[#1A1F36]">Contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-white border-[#E6EAF0] text-[#1A1F36] placeholder:text-[#8A94A6]"
            />
          </div>

          {error && <p className="text-[#EF4444] text-sm">{error}</p>}

          <Button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-white font-semibold shadow-sm hover:brightness-105"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

      </div>
    </div>
  )
}
