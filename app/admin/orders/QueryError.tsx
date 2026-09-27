import Link from 'next/link'

export function failedOrderQueries(scope: string, queries: { label: string; error: { code?: string } | null }[]) {
  const failed = queries.filter(query => query.error)
  if (failed.length) console.error('[orders] Data query failed', { scope, queries: failed.map(query => ({ resource: query.label, code: query.error?.code ?? 'unknown' })) })
  return failed.map(query => query.label)
}

export function OrderQueryError({ title, resources, retryHref }: { title: string; resources: string[]; retryHref: string }) {
  return <div className="mx-auto w-full max-w-2xl p-4 md:p-8">
    <Link className="text-sm text-muted-foreground hover:text-foreground" href="/admin/orders">← Órdenes</Link>
    <h1 className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
    <section role="alert" className="mt-6 rounded-xl border border-border bg-card p-6">
      <h2 className="font-medium text-foreground">No se pudo cargar la información</h2>
      <p className="mt-2 text-sm text-muted-foreground">No pudimos consultar: {resources.join(', ')}. Tus datos no se han modificado.</p>
      <Link href={retryHref} className="mt-4 inline-block text-sm text-primary hover:underline">Volver a intentar →</Link>
    </section>
  </div>
}
