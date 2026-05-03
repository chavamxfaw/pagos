'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Client } from '@/types'

type State = { error?: string } | null

export function ClientForm({
  action,
  defaultValues,
  submitLabel = 'Guardar',
}: {
  action: (prevState: State, formData: FormData) => Promise<State>
  defaultValues?: Partial<Client>
  submitLabel?: string
}) {
  const [state, formAction, pending] = useActionState(action, null)

  return (
    <form action={formAction} className="space-y-6">

      {/* Sección: Datos personales */}
      <div>
        <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-3">Datos de contacto</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre completo *" id="name">
            <Input id="name" name="name" defaultValue={defaultValues?.name} placeholder="Juan Pérez" required />
          </Field>
          <Field label="Correo electrónico *" id="email">
            <Input id="email" name="email" type="email" defaultValue={defaultValues?.email} placeholder="juan@ejemplo.com" required />
          </Field>
          <Field label="Teléfono" id="phone">
            <Input id="phone" name="phone" type="tel" defaultValue={defaultValues?.phone ?? ''} placeholder="+52 55 1234 5678" />
          </Field>
        </div>
      </div>

      {/* Sección: Datos fiscales */}
      <div>
        <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-3">Datos fiscales / empresa</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Empresa / Razón social" id="company">
            <Input id="company" name="company" defaultValue={defaultValues?.company ?? ''} placeholder="Empresa S.A. de C.V." />
          </Field>
          <Field label="RFC" id="rfc">
            <Input id="rfc" name="rfc" defaultValue={defaultValues?.rfc ?? ''} placeholder="XAXX010101000" className="uppercase" />
          </Field>
          <Field label="Dirección" id="address" className="sm:col-span-2">
            <Input id="address" name="address" defaultValue={defaultValues?.address ?? ''} placeholder="Calle, número, colonia, ciudad" />
          </Field>
        </div>
      </div>

      {/* Notas */}
      <div>
        <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-3">Notas internas</p>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={defaultValues?.notes ?? ''}
          placeholder="Información adicional visible solo para ti..."
          rows={3}
          className="resize-none"
        />
      </div>

      {state?.error && (
        <p className="text-[#EF4444] text-sm bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-lg px-4 py-2">{state.error}</p>
      )}

      <Button type="submit" disabled={pending} className="bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-white font-semibold shadow-sm hover:brightness-105">
        {pending ? 'Guardando...' : submitLabel}
      </Button>
    </form>
  )
}

function Field({
  label, id, children, className,
}: {
  label: string
  id: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ''}`}>
      <Label htmlFor={id} className="text-[#6B7280] text-sm">{label}</Label>
      {children}
    </div>
  )
}
