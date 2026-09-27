export const crmConfig = {
  opportunities: { table: 'crm_opportunities', title: 'Oportunidades', singular: 'oportunidad', description: 'Cada conversación, con un siguiente paso.', statuses: { new: 'Nueva', qualified: 'Calificada', proposal: 'Propuesta', negotiation: 'Negociación', won: 'Ganada', lost: 'Perdida' } },
  projects: { table: 'crm_projects', title: 'Proyectos', singular: 'proyecto', description: 'Organiza lo que estás construyendo para tus clientes.', statuses: { planned: 'Por iniciar', active: 'En curso', paused: 'En pausa', completed: 'Completado' } },
  tasks: { table: 'crm_tasks', title: 'Tareas', singular: 'tarea', description: 'Un lugar para lo que sigue.', statuses: { pending: 'Pendiente', in_progress: 'En curso', completed: 'Completada' } },
  proposals: { table: 'crm_proposals', title: 'Propuestas', singular: 'propuesta', description: 'Alcance, inversión y decisión en un mismo lugar.', statuses: { draft: 'Borrador', sent: 'Enviada', accepted: 'Aceptada', rejected: 'Rechazada' } },
  renewals: { table: 'crm_renewals', title: 'Renovaciones', singular: 'renovación', description: 'Mantén presentes los servicios que vuelven a vencer.', statuses: { upcoming: 'Próxima', contacted: 'Contactado', renewed: 'Renovada', cancelled: 'Cancelada' } },
} as const
export type CrmKind = keyof typeof crmConfig
export type CrmRecord = { id: string; title: string; notes: string; status: string; client_id: string | null; due_date: string | null; next_action?: string; value_amount?: number; budget_amount?: number; priority?: string; project_id?: string | null; opportunity_id?: string | null; source_opportunity_id?: string | null }
export function parseKind(value: unknown): CrmKind {
  if (typeof value !== 'string' || !Object.hasOwn(crmConfig, value)) throw new Error('Módulo inválido.')
  return value as CrmKind
}
export function parseId(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new Error('Identificador inválido.')
  return value
}
export function parseCrmInput(kind: CrmKind, data: FormData) {
  const title = String(data.get('title') ?? '').trim()
  const notes = String(data.get('notes') ?? '').trim()
  const status = String(data.get('status') ?? '')
  const date = String(data.get('due_date') ?? '')
  if (!title || title.length > 160) throw new Error('Escribe un título de hasta 160 caracteres.')
  if (notes.length > 5000) throw new Error('Las notas deben tener hasta 5,000 caracteres.')
  if (!Object.hasOwn(crmConfig[kind].statuses, status)) throw new Error('Estado inválido.')
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date)) throw new Error('Fecha inválida.')
  const client = String(data.get('client_id') ?? '')
  const result: Record<string, string | number | null> = { title, notes, status, due_date: date || null, client_id: client ? parseId(client) : null }
  if (kind === 'tasks' || kind === 'proposals') {
    for (const key of ['project_id', 'opportunity_id']) {
      const value = String(data.get(key) ?? '')
      result[key] = value ? parseId(value) : null
    }
  }
  if (kind === 'tasks') {
    const priority = String(data.get('priority') ?? 'normal')
    if (!['low', 'normal', 'high'].includes(priority)) throw new Error('Prioridad inválida.')
    result.priority = priority
  } else {
    const raw = String(data.get('amount') ?? '0')
    if (!/^\d+(\.\d{1,2})?$/.test(raw)) throw new Error('Ingresa un monto válido con hasta dos decimales.')
    const amount = Number(raw)
    if (!Number.isFinite(amount) || amount > 999999999) throw new Error('Monto fuera de rango.')
    result[kind === 'opportunities' ? 'value_amount' : 'budget_amount'] = amount
    if (kind === 'opportunities') {
      const next = String(data.get('next_action') ?? '').trim()
      if (next.length > 500) throw new Error('El siguiente paso admite hasta 500 caracteres.')
      result.next_action = next
    }
  }
  return result
}
