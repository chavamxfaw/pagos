import type { ReactNode } from 'react'
import { CheckCircle2, Clock3, ReceiptText } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'

export function PublicAccountHero({
  eyebrow = 'Estado de cuenta',
  title,
  subtitle,
  totalAmount,
  paidAmount,
  pendingAmount,
  percent,
}: {
  eyebrow?: string
  title: string
  subtitle?: string | null
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  percent: number
}) {
  return (
    <section className="mb-5 overflow-hidden rounded-xl border border-border bg-card p-5 text-foreground sm:p-6">
      <div className="mb-6">
        <div className="min-w-0">
          <p className="mb-2 text-sm font-medium text-primary">
            {eyebrow}
          </p>
          <h1 className="break-words text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="mt-2 break-words text-sm text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>

      </div>

      <div className="grid overflow-hidden rounded-xl border border-border bg-secondary/50 sm:grid-cols-3">
        <HeroMetric label="Total" value={formatCurrency(totalAmount)} icon={<ReceiptText className="size-3.5" />} />
        <HeroMetric label="Pagado" value={formatCurrency(paidAmount)} icon={<CheckCircle2 className="size-3.5" />} />
        <HeroMetric label="Pendiente" value={formatCurrency(pendingAmount)} icon={<Clock3 className="size-3.5" />} tone="pending" />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Progreso de pago</span>
          <span>{percent}%</span>
        </div>
        <div role="progressbar" aria-label="Progreso de pago" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary motion-safe:transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </section>
  )
}

function HeroMetric({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: string
  icon: ReactNode
  tone?: 'pending'
}) {
  return (
    <div className="border-border px-4 py-4 not-last:border-b sm:not-last:border-b-0 sm:not-last:border-r">
      <p className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className={cn('text-xl font-semibold tracking-tight tabular-nums text-foreground', tone === 'pending' && 'text-primary')}>
        {value}
      </p>
    </div>
  )
}
