'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Client } from '@/types'

type State = { error?: string } | null

export function OrderForm({
  action,
  clients,
  defaultClientId,
}: {
  action: (prevState: State, formData: FormData) => Promise<State>
  clients: Client[]
  defaultClientId?: string
}) {
  const [state, formAction, pending] = useActionState(action, null)

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="client_id" className="text-zinc-300">Cliente *</Label>
        <Select name="client_id" defaultValue={defaultClientId} required>
          <SelectTrigger className="bg-zinc-900 border-zinc-800 text-zinc-50">
            <SelectValue placeholder="Selecciona un cliente..." />
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-zinc-800">
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id} className="text-zinc-200 focus:bg-zinc-800">
                {client.name} — {client.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="concept" className="text-zinc-300">Concepto *</Label>
        <Input
          id="concept"
          name="concept"
          placeholder="Ej: Proyecto web, Mensualidad enero..."
          required
          className="bg-zinc-900 border-zinc-800 text-zinc-50"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="total_amount" className="text-zinc-300">Monto total (MXN) *</Label>
        <Input
          id="total_amount"
          name="total_amount"
          type="number"
          step="0.01"
          min="0.01"
          placeholder="0.00"
          required
          className="bg-zinc-900 border-zinc-800 text-zinc-50 font-mono"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-zinc-300">Descripción</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Detalles adicionales sobre la orden..."
          rows={3}
          className="bg-zinc-900 border-zinc-800 text-zinc-50 resize-none"
        />
      </div>

      {state?.error && (
        <p className="text-red-400 text-sm">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={pending}
        className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold"
      >
        {pending ? 'Creando...' : 'Crear orden'}
      </Button>
    </form>
  )
}
