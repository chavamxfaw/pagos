import type { StripeSettings } from '@/types'

export function calculateStripeFee(
  amount: number,
  settings: Pick<StripeSettings, 'fee_percent' | 'fixed_fee_amount' | 'fee_tax_percent'>
) {
  const taxMultiplier = getFeeTaxMultiplier(settings.fee_tax_percent)
  const fee = (amount * (settings.fee_percent / 100) + settings.fixed_fee_amount) * taxMultiplier
  return roundMoney(fee)
}

export function calculateStripeChargeAmount(
  amount: number,
  settings: Pick<StripeSettings, 'commission_payer' | 'fee_percent' | 'fixed_fee_amount' | 'fee_tax_percent'>
) {
  const paymentAmount = roundMoney(amount)

  if (settings.commission_payer === 'merchant') {
    return {
      paymentAmount,
      feeAmount: 0,
      absorbedFee: calculateStripeFee(paymentAmount, settings),
      totalCharged: paymentAmount,
    }
  }

  const taxMultiplier = getFeeTaxMultiplier(settings.fee_tax_percent)
  const rate = settings.fee_percent / 100
  const denominator = 1 - rate * taxMultiplier

  if (denominator <= 0) {
    throw new Error('La comisión configurada es demasiado alta para calcular el cargo.')
  }

  const totalCharged = roundMoney((paymentAmount + settings.fixed_fee_amount * taxMultiplier) / denominator)

  return {
    paymentAmount,
    feeAmount: roundMoney(totalCharged - paymentAmount),
    absorbedFee: 0,
    totalCharged,
  }
}

export function roundMoney(value: number) {
  return Math.round(value * 100) / 100
}

function getFeeTaxMultiplier(feeTaxPercent: number) {
  return 1 + Math.max(0, feeTaxPercent) / 100
}
