import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { crmConfig, parseCrmInput, parseId, parseKind } from './model'

// The caller authenticates the actor; every operation verifies the allowlist again.
export type CrmActor = { db: SupabaseClient; ownerId: string }
async function verifyActor({ db, ownerId }: CrmActor) {
  parseId(ownerId)
  const { data, error } = await db.from('app_admin_users').select('user_id').eq('user_id', ownerId).maybeSingle()
  if (error || !data) throw new Error('No autorizado.')
}

export async function listCrmRecords(actor: CrmActor, kindValue: unknown, options: { clientId?: string; projectId?: string; limit?: number } = {}) {
  await verifyActor(actor)
  const kind = parseKind(kindValue)
  const limit = options.limit ?? 100
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new Error('Límite inválido.')
  let query = actor.db.from(crmConfig[kind].table).select('*').eq('owner_user_id', actor.ownerId).order('created_at', { ascending: false }).limit(limit)
  if (options.clientId) query = query.eq('client_id', parseId(options.clientId))
  if (options.projectId && (kind === 'tasks' || kind === 'proposals')) query = query.eq('project_id', parseId(options.projectId))
  const { data, error } = await query
  if (error) throw new Error('No se pudieron cargar los registros.')
  return data ?? []
}

export async function saveCrmRecord(actor: CrmActor, kindValue: unknown, form: FormData, idValue?: unknown) {
  await verifyActor(actor)
  const kind = parseKind(kindValue)
  const input = parseCrmInput(kind, form)
  const id = idValue ? parseId(idValue) : null
  if (input.client_id) {
    const { data, error } = await actor.db.from('clients').select('id').eq('id', input.client_id).maybeSingle()
    if (error || !data) throw new Error('El contacto no está disponible.')
  }
  for (const [field, table] of [['project_id', 'crm_projects'], ['opportunity_id', 'crm_opportunities']] as const) {
    if (!input[field]) continue
    const { data, error } = await actor.db.from(table).select('id,client_id').eq('id', input[field]).eq('owner_user_id', actor.ownerId).maybeSingle()
    if (error || !data) throw new Error('La relación no está disponible.')
    if (data.client_id !== input.client_id) throw new Error('El proyecto o la oportunidad deben pertenecer al mismo contacto.')
  }
  const query = id
    ? actor.db.from(crmConfig[kind].table).update({ ...input, updated_at: new Date().toISOString() }).eq('id', id).eq('owner_user_id', actor.ownerId)
    : actor.db.from(crmConfig[kind].table).insert({ ...input, owner_user_id: actor.ownerId })
  const { data, error } = await query.select('*').maybeSingle()
  if (error?.code === '23514' && error.message.includes('crm_contact_relationship_conflict')) {
    throw new Error('El contacto debe coincidir con sus registros vinculados. Revisa las órdenes, tareas, propuestas y oportunidades antes de cambiarlo.')
  }
  if (error || !data) throw new Error('No se pudo guardar el registro.')
  return data
}

export async function deleteCrmRecord(actor: CrmActor, kindValue: unknown, idValue: unknown) {
  await verifyActor(actor)
  const kind = parseKind(kindValue)
  const id = parseId(idValue)
  const { data, error } = await actor.db.from(crmConfig[kind].table).delete().eq('id', id).eq('owner_user_id', actor.ownerId).select('id').maybeSingle()
  if (error || !data) throw new Error('No se pudo eliminar. Comprueba que no tenga registros asociados.')
  return data
}

export async function convertOpportunityToProject(actor: CrmActor, opportunityValue: unknown) {
  await verifyActor(actor)
  const opportunityId = parseId(opportunityValue)
  const { data, error } = await actor.db.rpc('crm_convert_opportunity', { p_owner: actor.ownerId, p_opportunity: opportunityId })
  if (error || !data) throw new Error('No se pudo convertir. Verifica que la oportunidad esté ganada y te pertenezca.')
  return data as { project_id: string; replayed: boolean }
}

export async function validateOrderProject(actor: CrmActor, projectValue: unknown, clientValue: unknown) {
  await verifyActor(actor)
  if (projectValue == null || projectValue === '') return null
  const projectId = parseId(projectValue)
  const clientId = parseId(clientValue)
  const { data, error } = await actor.db.from('crm_projects').select('id,client_id').eq('id', projectId).eq('owner_user_id', actor.ownerId).maybeSingle()
  if (error || !data || data.client_id !== clientId) throw new Error('El proyecto debe ser tuyo y pertenecer al contacto de la orden.')
  return projectId
}
