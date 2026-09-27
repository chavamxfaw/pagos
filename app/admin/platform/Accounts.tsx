'use client'
import { useActionState, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { accountStatuses, type PlatformAccount } from '@/lib/crm/platform-model'
import { saveAccount, deleteAccount } from './actions'

const input = 'mt-1.5 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring'
function AccountForm({ account, close }: { account?: PlatformAccount; close: () => void }) {
  const [state, action, pending] = useActionState(saveAccount, {})
  const [removed, remove, deleting] = useActionState(deleteAccount, {})
  const [confirm, setConfirm] = useState(false)
  useEffect(() => { if (state.success || removed.success) close() }, [state.success, removed.success, close])
  return <section className="mb-6 rounded-xl border border-border bg-white p-6"><h2 className="mb-5 text-lg font-semibold">{account ? 'Editar cuenta' : 'Nueva cuenta'}</h2><form action={action} className="grid gap-4 sm:grid-cols-2"><input type="hidden" name="id" value={account?.id ?? ''} />
    <label className="text-sm">Negocio<input autoFocus required name="name" maxLength={160} defaultValue={account?.name} className={input} /></label>
    <label className="text-sm">Plan<input required name="plan" maxLength={80} defaultValue={account?.plan ?? 'Inicial'} className={input} /></label>
    <label className="text-sm">Estado<select name="status" defaultValue={account?.status ?? 'trial'} className={input}>{Object.entries(accountStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="text-sm">Responsable<input name="contact_name" maxLength={160} defaultValue={account?.contact_name} className={input} /></label>
    <label className="text-sm sm:col-span-2">Correo del responsable<input type="email" name="contact_email" maxLength={254} defaultValue={account?.contact_email} className={input} /></label>
    <label className="text-sm sm:col-span-2">Notas<textarea name="notes" maxLength={5000} defaultValue={account?.notes} rows={3} className={`${input} h-auto py-3`} /></label>
    {state.error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{state.error}</p>}<div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={pending || deleting}>{pending ? 'Guardando…' : 'Guardar'}</Button><Button type="button" variant="outline" onClick={close}>Cancelar</Button></div></form>
    {account && <form action={remove} className="mt-5 border-t border-slate-100 pt-4"><input type="hidden" name="id" value={account.id} />{confirm ? <div className="flex flex-wrap items-center gap-3"><span className="text-sm">¿Eliminar este registro de cuenta?</span><Button variant="destructive" type="submit" disabled={pending || deleting}>Confirmar eliminación</Button><Button type="button" variant="ghost" onClick={() => setConfirm(false)}>Conservar</Button></div> : <Button variant="ghost" className="text-red-700" type="button" onClick={() => setConfirm(true)}>Eliminar registro</Button>}{removed.error && <p role="alert" className="mt-2 text-sm text-red-700">{removed.error}</p>}</form>}
  </section>
}
export function Accounts({ accounts, error }: { accounts: PlatformAccount[]; error?: string }) {
  const [edit, setEdit] = useState<PlatformAccount | 'new' | null>(null)
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const visible = accounts.filter(a => (!status || a.status === status) && `${a.name} ${a.contact_name} ${a.contact_email}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
  return <div className="mx-auto max-w-6xl p-4 sm:p-8"><header className="mb-8 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-semibold tracking-tight">Cuentas del sistema</h1><p className="mt-2 text-sm text-muted-foreground">Tu cartera de negocios y sus planes.</p></div><Button onClick={() => setEdit('new')} disabled={!!error}>Nueva cuenta</Button></header>
    <p className="mb-6 text-sm text-muted-foreground">Este registro lleva el control comercial. El acceso de cada negocio se habilitará cuando esté disponible su espacio independiente.</p>
    {error ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm">{error}</p> : <>{edit && <AccountForm key={edit === 'new' ? 'new' : edit.id} account={edit === 'new' ? undefined : edit} close={() => setEdit(null)} />}
    <div className="mb-6 grid gap-3 sm:grid-cols-2"><label className="text-sm">Buscar<input value={query} onChange={e => setQuery(e.target.value)} className={input} placeholder="Nombre o responsable" /></label><label className="text-sm">Estado<select className={input} value={status} onChange={e => setStatus(e.target.value)}><option value="">Todas las cuentas</option>{Object.entries(accountStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    <div className="overflow-hidden rounded-xl border border-border bg-white">{visible.length ? <ul className="divide-y divide-slate-100">{visible.map(a => <li key={a.id} className="flex flex-wrap items-center gap-4 p-5"><div className="min-w-0 flex-1"><h2 className="truncate font-medium">{a.name}</h2><p className="mt-1 text-sm text-muted-foreground">{a.contact_name || 'Sin responsable'}{a.contact_email ? ` · ${a.contact_email}` : ''}</p></div><span className="text-sm text-muted-foreground">{a.plan}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{accountStatuses[a.status as keyof typeof accountStatuses]}</span><Button size="sm" variant="ghost" onClick={() => setEdit(a)}>Editar</Button></li>)}</ul> : <p className="p-12 text-center text-sm text-muted-foreground">{query || status ? 'No hay cuentas que coincidan.' : 'Agrega tu primera cuenta para empezar.'}</p>}</div></>}
  </div>
}
