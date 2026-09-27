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
    <div className="mx-auto max-w-5xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <div className="mb-6">
        <Link href="/admin/profile" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          ← Perfil
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary">Configuración</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Datos bancarios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Cuentas de cobro</p>
        </div>
      </div>

      <section className="mb-8 overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border bg-primary/5 px-5 py-5 text-foreground">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Landmark className="size-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold">Nueva cuenta de cobro</h2>
              <p className="text-sm text-muted-foreground">Cuenta, CLABE o tarjeta</p>
            </div>
          </div>
        </div>
        <BankAccountForm action={createBankAccount} submitLabel="Guardar cuenta" />
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Cuentas guardadas</h2>
          <Badge className="border-input bg-white text-muted-foreground">
            {bankAccounts.length} {bankAccounts.length === 1 ? 'cuenta' : 'cuentas'}
          </Badge>
        </div>

        {!bankAccounts.length && (
          <div className="rounded-xl border border-dashed border-input bg-white p-8 text-center">
            <p className="text-sm font-semibold text-foreground">Sin datos bancarios todavía</p>
            <p className="mt-1 text-sm text-muted-foreground">No hay cuentas guardadas.</p>
          </div>
        )}

        <div className="grid gap-4">
          {bankAccounts.map((account) => (
            <article key={account.id} className="rounded-xl border border-border bg-card p-5 ">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-primary/8 text-primary">
                      <Building2 className="size-5" />
                    </span>
                    <div>
                      <h3 className="break-words font-semibold text-foreground">{account.alias}</h3>
                      <p className="text-sm text-muted-foreground">{account.bank_name}</p>
                    </div>
                    <Badge className={account.is_active ? 'border-[#2ED39A]/30 bg-[#2ED39A]/10 text-[#129B70]' : 'border-input bg-muted text-muted-foreground'}>
                      {account.is_active ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                  <div className="grid gap-2 break-words text-sm text-muted-foreground sm:grid-cols-2">
                    <p><span className="font-semibold text-foreground">Titular:</span> {account.account_holder}</p>
                    {account.clabe && <p><span className="font-semibold text-foreground">CLABE:</span> {account.clabe}</p>}
                    {account.account_number && <p><span className="font-semibold text-foreground">Cuenta:</span> {account.account_number}</p>}
                    {account.card_number && <p><span className="font-semibold text-foreground">Tarjeta:</span> {account.card_number}</p>}
                  </div>
                  {account.instructions && (
                    <p className="mt-3 break-words rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">{account.instructions}</p>
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

              <details className="mt-4 rounded-lg border border-border bg-muted/40">
                <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-foreground">
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
        <Field label="Titular" name="account_holder" defaultValue={account?.account_holder} placeholder="Chava Cervantes" required />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="CLABE" name="clabe" defaultValue={account?.clabe} placeholder="18 dígitos" inputMode="numeric" />
        <Field label="Cuenta" name="account_number" defaultValue={account?.account_number} placeholder="Número de cuenta" inputMode="numeric" />
        <Field label="Tarjeta" name="card_number" defaultValue={account?.card_number} placeholder="Opcional" inputMode="numeric" icon={<CreditCard className="size-4" />} />
      </div>

      <div className="grid min-w-0 gap-2">
        <Label htmlFor={`instructions-${account?.id ?? 'new'}`} className="text-foreground">Instrucciones</Label>
        <Textarea
          id={`instructions-${account?.id ?? 'new'}`}
          name="instructions"
          defaultValue={account?.instructions ?? ''}
          placeholder="Enviar comprobante por WhatsApp con el nombre de la orden."
          className="min-h-24 border-input bg-white text-foreground"
        />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-foreground">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={account?.is_active ?? true}
          className="size-4 rounded border-input"
        />
        Disponible para enviar en órdenes
      </label>

      <div>
        <Button type="submit" className="min-h-11 w-full bg-primary text-primary-foreground shadow-none hover:bg-primary/90 sm:w-auto">
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
    <div className="grid min-w-0 gap-2">
      <Label htmlFor={name} className="text-foreground">{label}</Label>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{icon}</span>}
        <Input
          id={name}
          name={name}
          defaultValue={defaultValue ?? ''}
          placeholder={placeholder}
          required={required}
          inputMode={inputMode}
          className={`border-input bg-white text-foreground ${icon ? 'pl-9' : ''}`}
        />
      </div>
    </div>
  )
}
