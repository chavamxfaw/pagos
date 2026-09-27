export default function AdminLoading() {
  return <div role="status" aria-label="Cargando espacio de trabajo" className="mx-auto max-w-6xl space-y-8 p-6 lg:p-10"><div className="h-4 w-48 animate-pulse rounded bg-muted" /><div className="h-9 w-32 animate-pulse rounded bg-muted" /><div className="h-16 animate-pulse rounded-lg bg-muted" /><div className="grid gap-8 md:grid-cols-2">{[0, 1].map(column => <div key={column} className="space-y-4">{[0, 1, 2].map(row => <div key={row} className="h-20 animate-pulse rounded-lg bg-muted" />)}</div>)}</div></div>
}
