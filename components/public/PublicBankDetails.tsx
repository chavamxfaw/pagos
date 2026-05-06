'use client'

import { useState } from 'react'
import { Copy, Landmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import type { BankAccount } from '@/types'
import { toast } from 'sonner'

export function PublicBankDetails({
  bankAccount,
  pendingAmount,
  compact = false,
}: {
  bankAccount: BankAccount
  pendingAmount: number
  compact?: boolean
}) {
  const [copied, setCopied] = useState(false)

  async function copyDetails() {
    const lines = [
      `Monto pendiente: ${formatCurrency(Math.max(0, pendingAmount))}`,
      `Banco: ${bankAccount.bank_name}`,
      `Titular: ${bankAccount.account_holder}`,
      bankAccount.clabe ? `CLABE: ${bankAccount.clabe}` : '',
      bankAccount.account_number ? `Cuenta: ${bankAccount.account_number}` : '',
      bankAccount.card_number ? `Tarjeta: ${bankAccount.card_number}` : '',
      bankAccount.instructions ? `Indicaciones: ${bankAccount.instructions}` : '',
    ]

    await navigator.clipboard.writeText(lines.filter(Boolean).join('\n'))
    setCopied(true)
    toast.success('Datos de pago copiados')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className={compact ? 'rounded-2xl border border-[#E6EAF0] bg-white p-4' : 'rounded-2xl border border-[#E6EAF0] bg-white p-5'}>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-[#EEF2FF] text-[#6C5CE7]">
          <Landmark className="size-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6C5CE7]">Datos para pago</p>
          <h2 className="text-sm font-semibold text-[#1A1F36]">{bankAccount.alias}</h2>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl bg-[#F8FAFF] p-4 text-sm ring-1 ring-[#E6EAF0]">
        <BankRow label="Monto pendiente" value={formatCurrency(Math.max(0, pendingAmount))} strong />
        <BankRow label="Banco" value={bankAccount.bank_name} />
        <BankRow label="Titular" value={bankAccount.account_holder} />
        {bankAccount.clabe && <BankRow label="CLABE" value={bankAccount.clabe} mono />}
        {bankAccount.account_number && <BankRow label="Cuenta" value={bankAccount.account_number} mono />}
        {bankAccount.card_number && <BankRow label="Tarjeta" value={bankAccount.card_number} mono />}
        {bankAccount.instructions && (
          <p className="border-t border-[#E6EAF0] pt-3 text-[#6B7280]">{bankAccount.instructions}</p>
        )}
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={copyDetails}
        className="mt-4 w-full justify-center border-[#D8DEE8] bg-white text-[#1A1F36] hover:bg-[#F8FAFF]"
      >
        <Copy className="size-4" />
        {copied ? 'Datos copiados' : 'Copiar datos de pago'}
      </Button>
    </section>
  )
}

function BankRow({
  label,
  value,
  mono,
  strong,
}: {
  label: string
  value: string
  mono?: boolean
  strong?: boolean
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[#6B7280]">{label}</span>
      <span className={`${mono ? 'font-mono' : ''} ${strong ? 'font-mono font-bold text-[#F4B740]' : 'font-semibold text-[#1A1F36]'}`}>
        {value}
      </span>
    </div>
  )
}
