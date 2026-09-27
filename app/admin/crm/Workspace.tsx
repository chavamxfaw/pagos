'use client'
import { useActionState, useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, X } from 'lucide-react'
import { saveCrm, deleteCrm, convertCrmOpportunity } from '@/actions/crm'
import { crmConfig, type CrmKind, type CrmRecord } from '@/lib/crm/model'
import { Button } from '@/components/ui/button'

type Contact = { id: string; name: string }
type Related = { id: string; title: string; client_id: string | null }
type ProjectOrder = { id: string; crm_project_id: string | null; concept: string; total_amount: number; paid_amount: number }
const field = 'h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'
function statusTone(status:string){
  if(['won','completed','accepted','paid','active'].includes(status))return 'bg-emerald-50 text-emerald-800'
  if(['lost','cancelled','rejected','expired'].includes(status))return 'bg-slate-100 text-slate-600'
  if(['paused','pending','negotiation','due'].includes(status))return 'bg-amber-50 text-amber-800'
  return 'bg-secondary text-secondary-foreground'
}
function Editor({ kind, record, clients, projects, opportunities, orders, initialClientId, initialProjectId, close }: { kind: CrmKind; record?: CrmRecord; clients: Contact[]; projects: Related[]; opportunities: Related[]; orders: ProjectOrder[]; initialClientId?: string; initialProjectId?: string; close: () => void }) {
  const [state, action, pending] = useActionState(saveCrm, {})
  const [deletion, remove, removing] = useActionState(deleteCrm, {})
  const [confirm, setConfirm] = useState(false)
  const [clientId, setClientId] = useState(record?.client_id ?? initialClientId ?? '')
  const [conversion, convert, converting] = useActionState(convertCrmOpportunity, {})
  useEffect(() => { if (state.success || deletion.success) close() }, [state.success, deletion.success, close])
  const config = crmConfig[kind]
  return <section className="mb-6 rounded-xl border border-border bg-white p-5 sm:p-6" aria-label={record ? 'Editar registro' : 'Crear registro'}>
    <div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-semibold">{record ? 'Editar' : kind === 'projects' ? 'Nuevo' : 'Nueva'} {config.singular}</h2><Button variant="ghost" size="icon" onClick={close} aria-label="Cerrar formulario"><X className="size-4" /></Button></div>
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={record?.id ?? ''} />
      <label className="space-y-1.5 text-sm sm:col-span-2">Título<input autoFocus name="title" required maxLength={160} defaultValue={record?.title} className={field} /></label>
      <label className="space-y-1.5 text-sm">Contacto<select name="client_id" value={clientId} onChange={e => setClientId(e.target.value)} className={field}><option value="">Sin contacto asociado</option>{clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <label className="space-y-1.5 text-sm">Estado<select name="status" defaultValue={record?.status ?? Object.keys(config.statuses)[0]} className={field}>{Object.entries(config.statuses).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="space-y-1.5 text-sm">Fecha objetivo<input name="due_date" type="date" defaultValue={record?.due_date ?? ''} className={field} /></label>
      {kind === 'tasks' ? <label className="space-y-1.5 text-sm">Prioridad<select name="priority" defaultValue={record?.priority ?? 'normal'} className={field}><option value="low">Baja</option><option value="normal">Normal</option><option value="high">Alta</option></select></label> : <label className="space-y-1.5 text-sm">{kind === 'projects' ? 'Presupuesto' : 'Valor estimado'} (MXN)<input name="amount" type="number" min="0" max="999999999" step="0.01" required defaultValue={record?.value_amount ?? record?.budget_amount ?? 0} className={field} /></label>}
      {kind === 'opportunities' && <label className="space-y-1.5 text-sm sm:col-span-2">Siguiente paso<input name="next_action" maxLength={500} defaultValue={record?.next_action} className={field} /></label>}
      {(kind === 'tasks' || kind === 'proposals') && <>
        <label className="space-y-1.5 text-sm">Proyecto<select key={`project-${clientId}`} name="project_id" defaultValue={record?.project_id ?? initialProjectId ?? ''} className={field}><option value="">Sin proyecto</option>{projects.filter(p => (p.client_id ?? '') === clientId).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
        <label className="space-y-1.5 text-sm">Oportunidad<select key={`opportunity-${clientId}`} name="opportunity_id" defaultValue={record?.opportunity_id ?? ''} className={field}><option value="">Sin oportunidad</option>{opportunities.filter(p => (p.client_id ?? '') === clientId).map(p => <option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
      </>}
      <label className="space-y-1.5 text-sm sm:col-span-2">Notas<textarea name="notes" rows={3} maxLength={5000} defaultValue={record?.notes} className={`${field} h-auto py-3`} /></label>
      {state.error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{state.error}</p>}
      <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={pending || removing}>{pending ? 'Guardando…' : 'Guardar'}</Button><Button type="button" variant="outline" onClick={close}>Cancelar</Button></div>
    </form>
    {kind === 'opportunities' && record?.status === 'won' && <form action={convert} className="mt-5 border-t border-slate-100 pt-4"><input type="hidden" name="id" value={record.id} /><Button variant="outline" type="submit" disabled={converting || pending}>{converting ? 'Creando proyecto…' : 'Convertir en proyecto'}</Button>{conversion.error && <p role="alert" className="mt-2 text-sm text-red-700">{conversion.error}</p>}{conversion.projectId && <p role="status" className="mt-3 text-sm"><Link className="text-primary underline" href={`/admin/crm/projects?edit=${conversion.projectId}`}>Proyecto listo. Abrir proyecto →</Link></p>}</form>}
    {kind === 'projects' && record && <div className="mt-5 flex flex-wrap gap-4 border-t border-slate-100 pt-4 text-sm"><Link className="text-primary" href={`/admin/crm/tasks?project=${record.id}${record.client_id ? `&client=${record.client_id}` : ''}`}>Ver tareas</Link><Link className="text-primary" href={`/admin/crm/proposals?project=${record.id}${record.client_id ? `&client=${record.client_id}` : ''}`}>Ver propuestas</Link>{record.client_id && <Link className="text-primary" href={`/admin/orders/new?project=${record.id}&client=${record.client_id}`}>Crear orden de cobro →</Link>}</div>}
    {kind === 'projects' && record && <div className="mt-5"><h3 className="text-sm font-medium">Cobros del proyecto</h3>{orders.filter(order => order.crm_project_id === record.id).length ? <ul className="mt-2 divide-y divide-slate-100">{orders.filter(order => order.crm_project_id === record.id).map(order => <li key={order.id} className="flex justify-between gap-4 py-3 text-sm"><Link className="text-primary" href={`/admin/orders/${order.id}`}>{order.concept}</Link><span className="text-muted-foreground">Pendiente: {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Math.max(0, order.total_amount - order.paid_amount))}</span></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">Todavía no hay órdenes asociadas.</p>}</div>}
    {record && <form action={remove} className="mt-5 border-t border-slate-100 pt-4"><input type="hidden" name="kind" value={kind} /><input type="hidden" name="id" value={record.id} />{confirm ? <div className="flex flex-wrap items-center gap-3"><span className="text-sm">Se eliminará este registro. ¿Continuar?</span><Button variant="destructive" disabled={pending || removing} type="submit">{removing ? 'Eliminando…' : 'Sí, eliminar'}</Button><Button variant="ghost" type="button" onClick={() => setConfirm(false)}>Conservar</Button></div> : <Button type="button" variant="ghost" className="text-red-700" onClick={() => setConfirm(true)}>Eliminar registro</Button>}{deletion.error && <p role="alert" className="mt-2 text-sm text-red-700">{deletion.error}</p>}</form>}
  </section>
}
export function Workspace({ kind, records, clients, projects, opportunities, orders, initialClientId, initialProjectId, editId, error }: { kind: CrmKind; records: CrmRecord[]; clients: Contact[]; projects: Related[]; opportunities: Related[]; orders: ProjectOrder[]; initialClientId?: string; initialProjectId?: string; editId?: string; error?: string }) {
  const [edit, setEdit] = useState<CrmRecord | 'new' | null>(() => records.find(r => r.id === editId) ?? null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const config = crmConfig[kind]
  const visible = records.filter(r => (!status || r.status === status) && `${r.title} ${clients.find(c => c.id === r.client_id)?.name ?? ''}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
  return <div className="mx-auto max-w-6xl p-4 sm:p-8">
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight text-foreground">{config.title}</h1><p className="mt-2 text-sm text-muted-foreground">{config.description}</p></div><Button onClick={() => setEdit('new')} disabled={!!error}><Plus className="mr-2 size-4" />{kind === 'projects' ? 'Nuevo proyecto' : `Nueva ${config.singular}`}</Button></header>
    {error ? <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">{error}</div> : <>
      {(initialClientId || initialProjectId) && <p className="mb-4 text-sm text-muted-foreground">Mostrando registros vinculados. <Link className="text-primary" href={`/admin/crm/${kind}`}>Ver todos</Link></p>}
      {edit && <Editor key={edit === 'new' ? 'new' : edit.id} kind={kind} record={edit === 'new' ? undefined : edit} clients={clients} projects={projects} opportunities={opportunities} orders={orders} initialClientId={initialClientId} initialProjectId={initialProjectId} close={() => setEdit(null)} />}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><span className="sr-only">Buscar {config.title.toLowerCase()}</span><Search className="absolute left-3 top-3.5 size-4 text-slate-400" /><input className={`${field} pl-10`} placeholder="Buscar por título o contacto" value={query} onChange={e => setQuery(e.target.value)} /></label><label><span className="sr-only">Filtrar por estado</span><select className={field} value={status} onChange={e => setStatus(e.target.value)}><option value="">Todos los estados</option>{Object.entries(config.statuses).map(([key, name]) => <option value={key} key={key}>{name}</option>)}</select></label></div>
      <div className="overflow-hidden rounded-xl border border-border bg-white"><div className="border-b border-slate-100 px-5 py-3 text-xs text-muted-foreground">{visible.length} registros</div>{visible.length ? <ul className="divide-y divide-slate-100">{visible.map(record => <li key={record.id} className="flex flex-wrap items-center gap-4 px-5 py-5"><button onClick={() => setEdit(record)} className="min-w-0 flex-1 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="block truncate font-medium text-foreground">{record.title}</span><span className="mt-1 block text-sm text-muted-foreground"><span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusTone(record.status)}`}>{(config.statuses as Record<string, string>)[record.status]}</span>{record.due_date ? ` · ${record.due_date.split('-').reverse().join('/')}` : ''}{record.priority === 'high' ? ' · Prioridad alta' : ''}</span>{record.next_action && <span className="mt-2 block text-sm text-slate-600">{record.next_action}</span>}</button>{record.client_id && <Link className="text-sm text-primary hover:underline" href={`/admin/clients/${record.client_id}`}>{clients.find(c => c.id === record.client_id)?.name ?? 'Ver contacto'}</Link>}{kind !== 'tasks' && <span className="text-sm tabular-nums text-slate-700">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(record.value_amount ?? record.budget_amount ?? 0)}</span>}<Button variant="ghost" size="sm" onClick={() => setEdit(record)}>Editar</Button></li>)}</ul> : <div className="px-5 py-16 text-center"><h2 className="font-medium">{query || status ? 'Sin coincidencias' : `Tus ${config.title.toLowerCase()} empiezan aquí`}</h2><p className="mt-2 text-sm text-muted-foreground">{query || status ? 'Prueba otro filtro o término de búsqueda.' : 'Agrega tu primer registro y vincúlalo con un contacto.'}</p></div>}</div>
    </>}
  </div>
}
