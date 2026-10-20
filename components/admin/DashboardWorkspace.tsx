'use client'

import { useState, type ReactNode } from 'react'
import { Tabs } from '@base-ui/react/tabs'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/** Slots keep data fetching and authorization on the server. */
export function DashboardWorkspace({ children, summary, activity }: {
  children: ReactNode
  summary: ReactNode
  activity: ReactNode
}) {
  const [open, setOpen] = useState(true)
  return <div className="flex min-h-full flex-col">
    <div className="flex items-center justify-between gap-3 border-b px-5 py-1">
      <span className="text-xs text-muted-foreground">Inicio <span className="mx-2">/</span> Cobranza</span>
      <Button variant="ghost" size="sm" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="dashboard-context">
        {open ? <PanelRightClose data-icon="inline-start" /> : <PanelRightOpen data-icon="inline-start" />}
        {open ? 'Ocultar resumen' : 'Mostrar resumen'}
      </Button>
    </div>
    <div className={cn('grid min-w-0 flex-1', open && 'xl:grid-cols-[minmax(0,1fr)_280px]')}>
      <div className="min-w-0">{children}</div>
      {open && <aside id="dashboard-context" aria-label="Información adicional" className="min-w-0 border-t bg-muted/40 p-4 xl:border-l xl:border-t-0">
        <Tabs.Root defaultValue="summary">
          <Tabs.List aria-label="Información del inicio" className="mb-6 flex gap-1 rounded-lg border bg-card p-1">
            <Tabs.Tab value="summary" className="min-h-10 flex-1 rounded-md px-3 text-sm text-muted-foreground data-[active]:bg-secondary data-[active]:font-medium data-[active]:text-secondary-foreground">Resumen</Tabs.Tab>
            <Tabs.Tab value="activity" className="min-h-10 flex-1 rounded-md px-3 text-sm text-muted-foreground data-[active]:bg-secondary data-[active]:font-medium data-[active]:text-secondary-foreground">Actividad</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="summary" className="flex flex-col gap-6">{summary}</Tabs.Panel>
          <Tabs.Panel value="activity">{activity}</Tabs.Panel>
        </Tabs.Root>
      </aside>}
    </div>
  </div>
}
