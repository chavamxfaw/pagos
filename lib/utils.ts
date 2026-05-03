import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { Order, PaymentMethod } from "@/types"

export const APP_TIME_ZONE = 'America/Monterrey'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: APP_TIME_ZONE,
  }).format(new Date(date))
}

export function formatDateShort(date: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-').map(Number)
    return new Intl.DateTimeFormat('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: APP_TIME_ZONE,
    }).format(new Date(year, month - 1, day))
  }

  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: APP_TIME_ZONE,
  }).format(new Date(date))
}

export function getTodayDateString(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function addDaysToDateString(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number)
  const value = new Date(year, month - 1, day)
  value.setDate(value.getDate() + days)

  const nextYear = value.getFullYear()
  const nextMonth = String(value.getMonth() + 1).padStart(2, '0')
  const nextDay = String(value.getDate()).padStart(2, '0')

  return `${nextYear}-${nextMonth}-${nextDay}`
}

export function getProgressPercent(paid: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(100, Math.round((paid / total) * 100))
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
    card: 'Tarjeta',
    check: 'Cheque',
    other: 'Otro',
  }

  return labels[method]
}

export function getOrderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'Pendiente',
    partial: 'Parcial',
    completed: 'Liquidado',
    cancelled: 'Cancelado',
    paused: 'Pausado',
    disputed: 'En disputa',
  }

  return labels[status] ?? status
}

export function getOrderTiming(order: Pick<Order, 'status' | 'due_date'>) {
  if (!order.due_date || ['completed', 'cancelled'].includes(order.status)) {
    return { key: 'none', label: null }
  }

  const [todayYear, todayMonth, todayDay] = getTodayDateString().split('-').map(Number)
  const today = new Date(todayYear, todayMonth - 1, todayDay).getTime()
  const due = new Date(`${order.due_date}T00:00:00`).getTime()
  const days = Math.ceil((due - today) / (24 * 60 * 60 * 1000))

  if (days < 0) return { key: 'overdue', label: `Vencida hace ${Math.abs(days)} día${Math.abs(days) !== 1 ? 's' : ''}` }
  if (days === 0) return { key: 'due_today', label: 'Vence hoy' }
  if (days <= 7) return { key: 'due_soon', label: `Vence en ${days} día${days !== 1 ? 's' : ''}` }
  return { key: 'scheduled', label: `Vence ${formatDateShort(order.due_date)}` }
}
