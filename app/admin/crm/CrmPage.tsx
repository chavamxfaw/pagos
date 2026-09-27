import { requireAdmin } from '@/lib/auth/admin'
import { createClient } from '@/lib/supabase/server'
import { parseId, type CrmKind, type CrmRecord } from '@/lib/crm/model'
import { listCrmRecords } from '@/lib/crm/service'
import { Workspace } from './Workspace'

export type CrmSearch = Promise<{ client?: string; project?: string; edit?: string }>
export async function CrmPage({ kind, searchParams }: { kind: CrmKind; searchParams?: CrmSearch }) {
  const user = await requireAdmin()
  const db = await createClient()
  const search = await searchParams ?? {}
  let clientId: string | undefined, projectId: string | undefined
  try { clientId = search.client ? parseId(search.client) : undefined; projectId = search.project ? parseId(search.project) : undefined } catch { /* Invalid filters cannot broaden server access. */ }
  const [records, clients, projects, opportunities] = await Promise.all([
    listCrmRecords({ db, ownerId: user.id }, kind, { clientId, projectId, limit: 1000 }).then(data => ({ data, error: false })).catch(() => ({ data: [], error: true })),
    db.from('clients').select('id,name').order('name').limit(1000),
    db.from('crm_projects').select('id,title,client_id').eq('owner_user_id', user.id).order('title').limit(1000),
    db.from('crm_opportunities').select('id,title,client_id').eq('owner_user_id', user.id).order('title').limit(1000),
  ])
  const projectIds = kind === 'projects' ? records.data.map(record => record.id) : []
  const orders = projectIds.length ? await db.from('orders').select('id,crm_project_id,concept,total_amount,paid_amount').in('crm_project_id', projectIds).order('created_at', { ascending: false }).limit(1000) : { data: [] }
  return <Workspace kind={kind} records={(records.data ?? []) as CrmRecord[]} clients={clients.data ?? []} projects={projects.data ?? []} opportunities={opportunities.data ?? []} orders={orders.data ?? []} initialClientId={clientId} initialProjectId={projectId} editId={search.edit} error={records.error || clients.error ? 'Este módulo todavía no está disponible. Si ya estaba activo, vuelve a cargar la página o revisa la conexión.' : undefined} />
}
