'use client'

import { useMemo, useState } from 'react'
import { Copy, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buildBankInstructionsMessage } from '@/lib/bank-instructions'
import { formatCurrency } from '@/lib/utils'
import type { BankAccount, OrderWithClient } from '@/types'
import { toast } from 'sonner'

export function BankInstructionsPanel({
  order,
  bankAccounts,
  sendAction,
}: {
  order: OrderWithClient
  bankAccounts: BankAccount[]
  sendAction: (formData: FormData) => void | Promise<void>
}) {
  const [selectedId, setSelectedId] = useState(bankAccounts[0]?.id ?? '')
  const [copied, setCopied] = useState(false)
  const [sending, setSending] = useState(false)
  const selected = useMemo(
    () => bankAccounts.find((account) => account.id === selectedId) ?? bankAccounts[0],
    [bankAccounts, selectedId]
  )
  const remaining = Math.max(0, order.total_amount - order.paid_amount)

  async function copyInstructions() {
    if (!selected) return
    const message = buildBankInstructionsMessage({
      order,
      bankAccount: selected,
      appUrl: window.location.origin,
    })

    await navigator.clipboard.writeText(message)
    setCopied(true)
    toast.success('Datos bancarios copiados', {
      description: `Incluye el saldo pendiente de ${formatCurrency(remaining)}.`,
    })
    setTimeout(() => setCopied(false), 2000)
  }

  async function sendInstructions(formData: FormData) {
    if (!selected) return

    setSending(true)
    const toastId = toast.loading('Enviando WhatsApp...', {
      description: `Datos de pago de ${selected.alias}`,
    })

    try {
      await sendAction(formData)
      toast.success('WhatsApp enviado', {
        id: toastId,
        description: 'Se mandaron los datos bancarios al teléfono del cliente.',
      })
    } catch (error) {
      toast.error('No se pudo enviar el WhatsApp', {
        id: toastId,
        description: error instanceof Error ? error.message : 'Revisa la configuración de Twilio.',
      })
    } finally {
      setSending(false)
    }
  }

  if (!bankAccounts.length) {
    return (
      <section className="mb-6 rounded-2xl border border-dashed border-[#D8DEE8] bg-white p-5">
        <p className="text-sm font-semibold text-[#1A1F36]">Datos bancarios</p>
        <p className="mt-1 text-sm text-[#6B7280]">
          Agrega una cuenta bancaria para copiar o enviar instrucciones de pago desde esta orden.
        </p>
        <a href="/admin/settings/bank-accounts" className="mt-3 inline-flex text-sm font-semibold text-[#4A8BFF] hover:text-[#6C5CE7]">
          Configurar datos bancarios
        </a>
      </section>
    )
  }

  return (
    <section className="mb-6 rounded-2xl border border-[#E6EAF0] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6C5CE7]">Datos bancarios</p>
          <h2 className="mt-1 text-lg font-bold text-[#1A1F36]">Instrucciones de pago</h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Pendiente actual: <span className="font-mono font-semibold text-[#F4B740]">{formatCurrency(remaining)}</span>
          </p>
        </div>
        <a href="/admin/settings/bank-accounts" className="text-sm font-semibold text-[#4A8BFF] hover:text-[#6C5CE7]">
          Administrar cuentas
        </a>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
        <select
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          className="h-10 rounded-lg border border-[#D8DEE8] bg-white px-3 text-sm text-[#1A1F36] outline-none transition-colors focus:border-[#4A8BFF] focus:ring-2 focus:ring-[#4A8BFF]/20"
        >
          {bankAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.alias} · {account.bank_name}
            </option>
          ))}
        </select>

        <Button
          type="button"
          variant="outline"
          onClick={copyInstructions}
          className="w-full justify-center border-[#D8DEE8] text-[#1A1F36] hover:bg-[#E6EAF0] sm:w-auto"
        >
          <Copy className="size-4" />
          {copied ? 'Copiado' : 'Copiar datos'}
        </Button>

        <form action={sendInstructions}>
          <input type="hidden" name="bank_account_id" value={selected?.id ?? ''} />
          <SendSubmitButton disabled={!selected || !order.clients.phone || sending} sending={sending} />
        </form>
      </div>

      {!order.clients.phone && (
        <p className="mt-3 text-xs text-[#EF4444]">El cliente no tiene teléfono registrado para WhatsApp.</p>
      )}
      <p className="mt-3 text-xs text-[#8A94A6]">
        El envío por WhatsApp usa el template aprobado cuando está configurado. Si Twilio no lo tiene disponible, se intenta como mensaje libre.
      </p>
    </section>
  )
}

function SendSubmitButton({ disabled, sending }: { disabled: boolean; sending: boolean }) {
  return (
    <Button
      type="submit"
      disabled={disabled}
      className="w-full justify-center bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] text-white shadow-sm hover:brightness-105 disabled:opacity-50 sm:w-auto"
    >
      <Send className="size-4" />
      {sending ? 'Enviando...' : 'Enviar por WhatsApp'}
    </Button>
  )
}
