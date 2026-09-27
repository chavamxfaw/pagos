'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { CreditCard, ShieldCheck } from 'lucide-react'
import { saveStripeSettings } from '@/actions/stripe-settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { calculateStripeChargeAmount } from '@/lib/stripe/math'
import { formatCurrency } from '@/lib/utils'
import type { StripeSettings } from '@/types'

export function StripeSettingsForm({ settings }: { settings: StripeSettings }) {
  const [pending, startTransition] = useTransition()
  const referenceCharge = calculateStripeChargeAmount(5000, settings)

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
    <section className="mb-6 overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-primary/5 px-5 py-5 text-foreground">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CreditCard className="size-5" />
          </span>
          <div>
            <h2 className="text-xl font-semibold">Configuración de cobro</h2>
            <p className="text-sm text-muted-foreground">{settings.enabled ? 'Pagos habilitados' : 'Pagos desactivados'}</p>
          </div>
        </div>
      </div>

      <form action={onSubmit} className="grid gap-5 p-6">
        <div className="rounded-lg border border-border bg-muted/40 p-4">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#EAFBF5] text-[#129B70]">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Cuenta Stripe</p>
              <p className="text-xs text-muted-foreground">{settings.stripe_account_id ?? 'Sin account id'}</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Stripe Account ID" name="stripe_account_id" defaultValue={settings.stripe_account_id ?? ''} placeholder="acct_..." required />
            <div className="grid min-w-0 gap-2">
              <Label htmlFor="mode" className="text-foreground">Modo</Label>
              <select
                id="mode"
                name="mode"
                defaultValue={settings.mode}
                className="min-h-11 rounded-lg border border-input bg-white px-3 text-sm text-foreground"
              >
                <option value="test">Sandbox / test</option>
                <option value="live">Producción</option>
              </select>
            </div>
          </div>
        </div>

        <label className="flex items-start gap-3 rounded-lg border border-border bg-white p-4">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={settings.enabled}
            className="mt-1 size-4 rounded border-input accent-primary"
          />
          <span>
            <span className="block text-sm font-semibold text-foreground">Habilitar pagos con Stripe</span>
          </span>
        </label>

        <div className="rounded-lg border border-border bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">Comisión</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-xl border border-border p-3">
              <input type="radio" name="commission_payer" value="merchant" defaultChecked={settings.commission_payer === 'merchant'} className="mt-1 size-4 accent-primary" />
              <span>
                <span className="block text-sm font-semibold text-foreground">Yo absorbo la comisión</span>
                <span className="block text-xs text-muted-foreground">El cliente paga exactamente el abono.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-border p-3">
              <input type="radio" name="commission_payer" value="customer" defaultChecked={settings.commission_payer === 'customer'} className="mt-1 size-4 accent-primary" />
              <span>
                <span className="block text-sm font-semibold text-foreground">El cliente paga la comisión</span>
                <span className="block text-xs text-muted-foreground">Se suma al cargo de Stripe, pero el abono registrado queda limpio.</span>
              </span>
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Field label="Comisión %" name="fee_percent" type="number" step="0.001" min="0" defaultValue={String(settings.fee_percent)} />
            <Field label="Comisión fija MXN" name="fixed_fee_amount" type="number" step="0.01" min="0" defaultValue={String(settings.fixed_fee_amount)} />
            <Field label="IVA sobre comisión %" name="fee_tax_percent" type="number" step="0.001" min="0" defaultValue={String(settings.fee_tax_percent ?? 16)} />
            <Field label="Mínimo global MXN" name="minimum_payment_amount" type="number" step="0.01" min="1" defaultValue={String(settings.minimum_payment_amount)} />
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            Referencia {formatCurrency(5000)}: cargo a tarjeta {formatCurrency(referenceCharge.totalCharged)}
            {settings.commission_payer === 'customer' && ` · comisión estimada ${formatCurrency(referenceCharge.feeAmount)}`}
            {settings.commission_payer === 'merchant' && ` · comisión absorbida estimada ${formatCurrency(referenceCharge.absorbedFee)}`}
          </p>
        </div>

        <div className="rounded-lg border border-[#F4B740]/30 bg-[#FFF7E6] p-4 text-sm text-[#7A5600]">
          Validar tratamiento fiscal de comisiones antes de usar en producción.
        </div>

        <div>
          <Button
            type="submit"
            disabled={pending}
            className="min-h-11 w-full bg-primary text-primary-foreground shadow-none hover:bg-primary/90 sm:w-auto"
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
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={name} className="text-foreground">{label}</Label>
      <Input
        id={name}
        name={name}
        type={type}
        step={step}
        min={min}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="min-h-11 min-w-0 border-input bg-background text-foreground"
      />
    </div>
  )
}
