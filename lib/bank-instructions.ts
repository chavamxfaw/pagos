import { formatCurrency } from '@/lib/utils'
import type { BankAccount, OrderWithClient } from '@/types'

export function buildBankInstructionsMessage({
  order,
  bankAccount,
  appUrl,
}: {
  order: OrderWithClient
  bankAccount: BankAccount
  appUrl: string
}) {
  const remaining = Math.max(0, order.total_amount - order.paid_amount)
  const normalizedAppUrl = appUrl.replace(/\/$/, '')
  const lines = [
    `Hola ${order.clients.name}, te compartimos los datos para realizar el pago de tu orden ${order.concept}.`,
    '',
    `Monto pendiente: ${formatCurrency(remaining)}`,
    '',
    `Banco: ${bankAccount.bank_name}`,
    `Titular: ${bankAccount.account_holder}`,
    bankAccount.clabe ? `CLABE: ${bankAccount.clabe}` : '',
    bankAccount.account_number ? `Cuenta: ${bankAccount.account_number}` : '',
    bankAccount.card_number ? `Tarjeta: ${bankAccount.card_number}` : '',
    bankAccount.instructions ? `Indicaciones: ${bankAccount.instructions}` : '',
    '',
    `Puedes revisar el detalle aquí: ${normalizedAppUrl}/p/${order.token}`,
  ]

  return lines.filter(Boolean).join('\n')
}
