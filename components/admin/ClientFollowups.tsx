'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatDateShort } from '@/lib/utils'
import type { ClientFollowup } from '@/types'

type State = { error?: string; success?: boolean } | null

const typeLabels: Record<ClientFollowup['note_type'], string> = {
  note: 'Nota',
  call: 'Llamada',
  promise: 'Promesa de pago',
  reminder: 'Recordatorio',
  invoice: 'Factura',
}

export function ClientFollowups({
  followups,
  action,
}: {
  followups: ClientFollowup[]
  action: (prevState: State, formData: FormData) => Promise<State>
}) {
  const [state, formAction, pending] = useActionState(action, null)

  return (
    <div className="rounded-2xl border border-[#E3E8F0] bg-white/90 p-5 shadow-[0_10px_30px_rgba(26,31,54,0.025)]">
      <div className="mb-5">
        <p className="text-sm font-semibold uppercase tracking-wider text-[#6B7280]">Seguimiento</p>
        <h2 className="mt-1 text-xl font-bold text-[#1A1F36]">Notas de cobranza</h2>
      </div>

      <form action={formAction} className="mb-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm text-[#6B7280]">Tipo</Label>
            <Select name="note_type" defaultValue="note">
              <SelectTrigger className="h-11 bg-white border-[#E6EAF0] text-[#1A1F36]"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-white border-[#E6EAF0]">
                <SelectItem value="note">Nota</SelectItem>
                <SelectItem value="call">Llamada</SelectItem>
                <SelectItem value="promise">Promesa de pago</SelectItem>
                <SelectItem value="reminder">Recordatorio</SelectItem>
                <SelectItem value="invoice">Factura</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="follow_up_date" className="text-sm text-[#6B7280]">Fecha de seguimiento</Label>
            <Input id="follow_up_date" type="date" name="follow_up_date" className="h-11 bg-white border-[#E6EAF0] text-[#1A1F36]" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="content" className="text-sm text-[#6B7280]">Nota</Label>
          <Textarea
            id="content"
            name="content"
            required
            rows={4}
            placeholder="Prometió pagar el viernes..."
            className="min-h-28 w-full bg-white border-[#E6EAF0] text-[#1A1F36] resize-y"
          />
        </div>
        {state?.error && <p className="text-sm text-[#EF4444]">{state.error}</p>}
        <Button type="submit" disabled={pending} className="w-full justify-center bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-white font-semibold shadow-sm hover:brightness-105">
          {pending ? 'Guardando...' : 'Agregar seguimiento'}
        </Button>
      </form>

      {!followups.length ? (
        <p className="text-sm text-[#8A94A6]">Sin seguimientos registrados.</p>
      ) : (
        <div className="space-y-3">
          {followups.map((followup) => (
            <div key={followup.id} className="rounded-xl border border-[#E6EAF0] bg-[#F8FAFF] p-4">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-[#4A8BFF] ring-1 ring-[#E6EAF0]">
                  {typeLabels[followup.note_type]}
                </span>
                <span className="text-xs text-[#8A94A6]">{formatDateShort(followup.created_at)}</span>
                {followup.follow_up_date && (
                  <span className="text-xs font-semibold text-[#F4B740]">Dar seguimiento: {formatDateShort(followup.follow_up_date)}</span>
                )}
              </div>
              <p className="text-sm text-[#1A1F36]">{followup.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
