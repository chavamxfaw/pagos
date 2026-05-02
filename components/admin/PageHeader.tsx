interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-7">
      <div>
        <h1 className="text-xl font-semibold text-zinc-50">{title}</h1>
        {subtitle && <p className="text-zinc-500 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
