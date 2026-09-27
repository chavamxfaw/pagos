import { legalIdentity } from '@/lib/legal-config'

export function LegalIdentity() {
  const identity = legalIdentity()
  return <>
    {!identity.ready && <p role="status" className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">Borrador para revisión. Falta confirmar el domicilio del responsable. Este texto no es todavía el aviso definitivo para producción.</p>}
    <p>{identity.name}, operador de OTLA, es responsable del tratamiento descrito en este aviso.</p>
    <p>Domicilio de contacto: {identity.address || 'pendiente de confirmación antes de publicar el aviso definitivo'}.</p>
    <p>Privacidad y soporte: <a href={`mailto:${identity.email}`}>{identity.email}</a>.</p>
  </>
}
