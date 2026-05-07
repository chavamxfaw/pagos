'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { CreditCard, ShieldCheck } from 'lucide-react'
import { saveStripeSettings } from '@/actions/stripe-settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCurrency } from '@/lib/utils'
import type { StripeSettings } from '@/types'

export function StripeSettingsForm({ settings }: { settings: StripeSettings }) {
  const [pending, startTransition] = useTransition()

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      try {
        await saveStripeSettings(formData)
        toast.success('Configuración de Stripe guardada')
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'No se pudo guardar Stripe')
      }
    })
  }

  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-[#E3E8F0] bg-white/90 shadow-[0_10px_30px_rgba(26,31,54,0.025)]">
      <div className="bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] px-6 py-7 text-white">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/18 ring-1 ring-white/25">
            <CreditCard className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-bold">Cuenta conectada</h2>
            <p className="text-sm text-white/70">Configuración activa</p>
          </div>
        </div>
      </div>

      <form action={onSubmit} className="grid gap-5 p-6">
        <div className="rounded-2xl border border-[#E6EAF0] bg-[#F8FAFF] p-4">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#EAFBF5] text-[#129B70]">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-[#1A1F36]">Stripe account</p>
              <p className="text-xs text-[#6B7280]">{settings.stripe_account_id ?? 'Sin account id'}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Stripe Account ID" name="stripe_account_id" defaultValue={settings.stripe_account_id ?? ''} placeholder="acct_..." required />
            <div className="grid gap-2">
              <Label htmlFor="mode" className="text-[#1A1F36]">Modo</Label>
              <select
                id="mode"
                name="mode"
                defaultValue={settings.mode}
                className="min-h-11 rounded-lg border border-[#D8DEE8] bg-white px-3 text-sm text-[#1A1F36]"
              >
                <option value="test">Sandbox / test</option>
                <option value="live">Producción</option>
              </select>
            </div>
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-2xl border border-[#E6EAF0] bg-white p-4">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={settings.enabled}
            className="mt-1 size-4 rounded border-[#D8DEE8] accent-[#6C5CE7]"
          />
          <span>
            <span className="block text-sm font-semibold text-[#1A1F36]">Habilitar pagos con Stripe</span>
          </span>
        </label>

        <div className="rounded-2xl border border-[#E6EAF0] bg-white p-4">
          <h3 className="mb-3 text-sm font-bold text-[#1A1F36]">Comisión</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-xl border border-[#E6EAF0] p-3">
              <input type="radio" name="commission_payer" value="merchant" defaultChecked={settings.commission_payer === 'merchant'} className="mt-1 size-4 accent-[#6C5CE7]" />
              <span>
                <span className="block text-sm font-semibold text-[#1A1F36]">Yo absorbo la comisión</span>
                <span className="block text-xs text-[#6B7280]">El cliente paga exactamente el abono.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-[#E6EAF0] p-3">
              <input type="radio" name="commission_payer" value="customer" defaultChecked={settings.commission_payer === 'customer'} className="mt-1 size-4 accent-[#6C5CE7]" />
              <span>
                <span className="block text-sm font-semibold text-[#1A1F36]">El cliente paga la comisión</span>
                <span className="block text-xs text-[#6B7280]">Se suma al cargo de Stripe, pero el abono registrado queda limpio.</span>
              </span>
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Comisión %" name="fee_percent" type="number" step="0.001" min="0" defaultValue={String(settings.fee_percent)} />
            <Field label="Comisión fija MXN" name="fixed_fee_amount" type="number" step="0.01" min="0" defaultValue={String(settings.fixed_fee_amount)} />
            <Field label="Mínimo global MXN" name="minimum_payment_amount" type="number" step="0.01" min="1" defaultValue={String(settings.minimum_payment_amount)} />
          </div>

          <p className="mt-3 text-xs text-[#6B7280]">
            Referencia {formatCurrency(5000)}: {formatCurrency(5000 + (5000 * settings.fee_percent / 100) + settings.fixed_fee_amount)}
          </p>
        </div>

        <div className="rounded-2xl border border-[#F4B740]/30 bg-[#FFF7E6] p-4 text-sm text-[#7A5600]">
          Validar tratamiento fiscal de comisiones antes de usar en producción.
        </div>

        <div>
          <Button
            type="submit"
            disabled={pending}
            className="w-full bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-white shadow-sm hover:brightness-105 sm:w-auto"
          >
            {pending ? 'Guardando...' : 'Guardar configuración'}
          </Button>
        </div>
      </form>
    </section>
  )
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  type = 'text',
  step,
  min,
}: {
  label: string
  name: string
  defaultValue?: string
  placeholder?: string
  required?: boolean
  type?: string
  step?: string
  min?: string
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name} className="text-[#1A1F36]">{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        step={step}
        min={min}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="border-[#D8DEE8] bg-white text-[#1A1F36]"
      />
    </div>
  )
}
