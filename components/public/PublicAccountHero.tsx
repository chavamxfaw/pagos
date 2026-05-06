import type { ReactNode } from 'react'
import { CheckCircle2, Clock3, Layers3, ReceiptText } from 'lucide-react'
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
    <section className="mb-4 overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#6C5CE7_0%,#4A8BFF_100%)] p-5 text-white shadow-[0_20px_50px_rgba(74,139,255,0.22)] sm:p-7">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/70">
            <span className="h-px w-7 bg-white/35" />
            {eyebrow}
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
          {subtitle && (
            <p className="mt-3 inline-flex min-h-8 items-center rounded-full bg-white/14 px-3 text-xs font-semibold text-white ring-1 ring-white/22">
              {subtitle}
            </p>
          )}
        </div>

        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/14 text-white ring-1 ring-white/25">
          <Layers3 className="size-7" />
        </div>
      </div>

      <div className="grid overflow-hidden rounded-2xl border border-white/25 bg-white/9 sm:grid-cols-3">
        <HeroMetric label="Total" value={formatCurrency(totalAmount)} icon={<ReceiptText className="size-3.5" />} />
        <HeroMetric label="Pagado" value={formatCurrency(paidAmount)} icon={<CheckCircle2 className="size-3.5" />} />
        <HeroMetric label="Pendiente" value={formatCurrency(pendingAmount)} icon={<Clock3 className="size-3.5" />} tone="pending" />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-white/72">
          <span>Progreso general</span>
          <span>{percent}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white/55 transition-all duration-700"
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
    <div className="border-white/20 px-4 py-4 not-last:border-b sm:not-last:border-b-0 sm:not-last:border-r">
      <p className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
        {icon}
        {label}
      </p>
      <p className={cn('font-mono text-lg font-bold tracking-tight text-white', tone === 'pending' && 'text-[#FFE1A3]')}>
        {value}
      </p>
    </div>
  )
}
