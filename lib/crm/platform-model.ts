export const accountStatuses = { trial: 'Prueba', active: 'Activa', suspended: 'Suspendida', cancelled: 'Cancelada' } as const
export type PlatformAccount = { id: string; name: string; status: string; plan: string; contact_name: string; contact_email: string; notes: string }
export function parsePlatformAccount(form: FormData) {
  const fields = { name: String(form.get('name') ?? '').trim(), status: String(form.get('status') ?? ''), plan: String(form.get('plan') ?? '').trim(), contact_name: String(form.get('contact_name') ?? '').trim(), contact_email: String(form.get('contact_email') ?? '').trim(), notes: String(form.get('notes') ?? '').trim() }
  if (!fields.name || fields.name.length > 160) throw new Error('El nombre admite entre 1 y 160 caracteres.')
  if (!Object.hasOwn(accountStatuses, fields.status)) throw new Error('Estado inválido.')
  if (!fields.plan || fields.plan.length > 80) throw new Error('Escribe un plan de hasta 80 caracteres.')
  if (fields.contact_name.length > 160 || fields.notes.length > 5000) throw new Error('El contacto o las notas exceden el límite.')
  if (fields.contact_email && (fields.contact_email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.contact_email))) throw new Error('Correo inválido.')
  return fields
}
