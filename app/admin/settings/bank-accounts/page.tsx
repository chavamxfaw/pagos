import Link from 'next/link'
import { Building2, CreditCard, Landmark } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createBankAccount, deleteBankAccount, updateBankAccount } from '@/actions/bank-accounts'
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { BankAccount } from '@/types'

export default async function BankAccountsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('bank_accounts')
    .select('*')
    .order('created_at', { ascending: false })

  const bankAccounts = (data ?? []) as BankAccount[]

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-8">
      <div className="mb-6">
        <Link href="/admin/profile" className="text-sm text-[#6B7280] transition-colors hover:text-[#1A1F36]">
          ← Perfil
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6C5CE7]">Configuración</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#1A1F36]">Datos bancarios</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Guarda tus cuentas de cobro para copiarlas o enviarlas desde una orden.
          </p>
        </div>
      </div>

      <section className="mb-8 overflow-hidden rounded-3xl border border-white bg-white shadow-[0_18px_45px_rgba(26,31,54,0.08)] ring-1 ring-[#E6EAF0]/80">
        <div className="bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] px-6 py-7 text-white">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-white/18 ring-1 ring-white/25">
              <Landmark className="size-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold">Nueva cuenta de cobro</h2>
              <p className="text-sm text-white/70">Solo guarda datos de cuenta, CLABE o tarjeta. No guardes claves bancarias.</p>
            </div>
          </div>
        </div>
        <BankAccountForm action={createBankAccount} submitLabel="Guardar cuenta" />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#1A1F36]">Cuentas guardadas</h2>
          <Badge className="border-[#D8DEE8] bg-white text-[#6B7280]">
            {bankAccounts.length} {bankAccounts.length === 1 ? 'cuenta' : 'cuentas'}
          </Badge>
        </div>

        {!bankAccounts.length && (
          <div className="rounded-3xl border border-dashed border-[#D8DEE8] bg-white p-8 text-center">
            <p className="text-sm font-semibold text-[#1A1F36]">Sin datos bancarios todavía</p>
            <p className="mt-1 text-sm text-[#6B7280]">Agrega una cuenta para tenerla disponible en tus órdenes.</p>
          </div>
        )}

        <div className="grid gap-4">
          {bankAccounts.map((account) => (
            <article key={account.id} className="rounded-3xl border border-[#E6EAF0] bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="flex size-10 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#6C5CE7]">
                      <Building2 className="size-5" />
                    </span>
                    <div>
                      <h3 className="font-bold text-[#1A1F36]">{account.alias}</h3>
                      <p className="text-sm text-[#6B7280]">{account.bank_name}</p>
                    </div>
                    <Badge className={account.is_active ? 'border-[#2ED39A]/30 bg-[#2ED39A]/10 text-[#129B70]' : 'border-[#D8DEE8] bg-[#E6EAF0] text-[#6B7280]'}>
                      {account.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                  <div className="grid gap-2 text-sm text-[#6B7280] sm:grid-cols-2">
                    <p><span className="font-semibold text-[#1A1F36]">Titular:</span> {account.account_holder}</p>
                    {account.clabe && <p><span className="font-semibold text-[#1A1F36]">CLABE:</span> {account.clabe}</p>}
                    {account.account_number && <p><span className="font-semibold text-[#1A1F36]">Cuenta:</span> {account.account_number}</p>}
                    {account.card_number && <p><span className="font-semibold text-[#1A1F36]">Tarjeta:</span> {account.card_number}</p>}
                  </div>
                  {account.instructions && (
                    <p className="mt-3 rounded-2xl bg-[#F8FAFF] p-3 text-sm text-[#6B7280]">{account.instructions}</p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <DeleteConfirmDialog
                    action={deleteBankAccount.bind(null, account.id)}
                    title="Borrar datos bancarios"
                    description={`Se eliminará la cuenta "${account.alias}". Esta acción no se puede deshacer.`}
                    confirmLabel="Borrar cuenta"
                    triggerLabel="Borrar"
                  />
                </div>
              </div>

              <details className="mt-4 rounded-2xl border border-[#E6EAF0] bg-[#F8FAFF]">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-[#1A1F36]">
                  Editar cuenta
                </summary>
                <BankAccountForm
                  action={updateBankAccount.bind(null, account.id)}
                  submitLabel="Actualizar cuenta"
                  account={account}
                  compact
                />
              </details>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function BankAccountForm({
  action,
  submitLabel,
  account,
  compact = false,
}: {
  action: (formData: FormData) => Promise<void>
  submitLabel: string
  account?: BankAccount
  compact?: boolean
}) {
  return (
    <form action={action} className={compact ? 'grid gap-4 p-4' : 'grid gap-5 p-6'}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Alias" name="alias" defaultValue={account?.alias} placeholder="BBVA principal" required />
        <Field label="Banco" name="bank_name" defaultValue={account?.bank_name} placeholder="BBVA" required />
        <Field label="Titular" name="account_holder" defaultValue={account?.account_holder} placeholder="OTLA Pagos" required />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="CLABE" name="clabe" defaultValue={account?.clabe} placeholder="18 dígitos" inputMode="numeric" />
        <Field label="Cuenta" name="account_number" defaultValue={account?.account_number} placeholder="Número de cuenta" inputMode="numeric" />
        <Field label="Tarjeta" name="card_number" defaultValue={account?.card_number} placeholder="Opcional" inputMode="numeric" icon={<CreditCard className="size-4" />} />
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`instructions-${account?.id ?? 'new'}`} className="text-[#1A1F36]">Instrucciones</Label>
        <Textarea
          id={`instructions-${account?.id ?? 'new'}`}
          name="instructions"
          defaultValue={account?.instructions ?? ''}
          placeholder="Ej. Enviar comprobante por WhatsApp con el nombre de la orden."
          className="min-h-24 border-[#D8DEE8] bg-white text-[#1A1F36]"
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-[#1A1F36]">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={account?.is_active ?? true}
          className="size-4 rounded border-[#D8DEE8]"
        />
        Disponible para enviar en órdenes
      </label>

      <div>
        <Button type="submit" className="w-full bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-white shadow-sm hover:brightness-105 sm:w-auto">
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  required,
  inputMode,
  icon,
}: {
  label: string
  name: string
  defaultValue?: string | null
  placeholder?: string
  required?: boolean
  inputMode?: 'numeric'
  icon?: React.ReactNode
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name} className="text-[#1A1F36]">{label}</Label>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8A94A6]">{icon}</span>}
        <Input
          id={name}
          name={name}
          defaultValue={defaultValue ?? ''}
          placeholder={placeholder}
          required={required}
          inputMode={inputMode}
          className={`border-[#D8DEE8] bg-white text-[#1A1F36] ${icon ? 'pl-9' : ''}`}
        />
      </div>
    </div>
  )
}
