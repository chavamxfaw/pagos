interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-7">
      <div>
        <h1 className="text-xl font-semibold text-[#1A1F36]">{title}</h1>
        {subtitle && <p className="text-[#6B7280] text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="self-start sm:self-auto">{action}</div>}
    </div>
  )
}
