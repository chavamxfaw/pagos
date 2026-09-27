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
      <section className="mb-6 rounded-xl border border-dashed border-border bg-card p-5">
        <p className="text-sm font-semibold text-foreground">Datos bancarios</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Agrega una cuenta bancaria para copiar o enviar instrucciones de pago desde esta orden.
        </p>
        <a href="/admin/settings/bank-accounts" className="mt-3 inline-flex text-sm font-semibold text-primary hover:text-primary">
          Configurar datos bancarios
        </a>
      </section>
    )
  }

  return (
    <section className="mb-6 rounded-xl border border-border bg-card p-5 shadow-none">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Datos bancarios</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">Instrucciones de pago</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pendiente actual: <span className="tabular-nums font-semibold text-amber-700">{formatCurrency(remaining)}</span>
          </p>
        </div>
        <a href="/admin/settings/bank-accounts" className="text-sm font-semibold text-primary hover:text-primary">
          Administrar cuentas
        </a>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center">
        <select
          aria-label="Cuenta bancaria para instrucciones de pago"
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
          className="h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-ring/20"
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
          className="w-full justify-center border-border text-foreground hover:bg-muted sm:w-auto"
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
        <p className="mt-3 text-xs text-destructive">El cliente no tiene teléfono registrado para WhatsApp.</p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        WhatsApp usa la plantilla aprobada configurada; las versiones antiguas pueden no incluir el remitente. La versión con remitente requiere aprobación en Twilio. Sin plantilla, el mensaje libre depende de la ventana de conversación del proveedor.
      </p>
    </section>
  )
}

function SendSubmitButton({ disabled, sending }: { disabled: boolean; sending: boolean }) {
  return (
    <Button
      type="submit"
      disabled={disabled}
      className="w-full justify-center bg-primary text-primary-foreground shadow-none hover:bg-primary/90 disabled:opacity-50 sm:w-auto"
    >
      <Send className="size-4" />
      {sending ? 'Enviando...' : 'Enviar por WhatsApp'}
    </Button>
  )
}
