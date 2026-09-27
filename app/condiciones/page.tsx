import type { Metadata } from 'next'
import Link from 'next/link'
import { PublicShell, LegalSection } from '@/components/public-shell'
import { LegalIdentity } from '@/components/legal-identity'

export const metadata: Metadata = { title: 'Condiciones de uso' }

export default function TermsPage() {
  return <PublicShell><article className="max-w-3xl space-y-8">
    <header><p className="text-sm text-primary">Uso de la plataforma</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Condiciones de uso</h1><p className="mt-3 text-sm text-muted-foreground">Última actualización: 27 de septiembre de 2026</p></header>
    <LegalSection title="1. Operador y alcance"><LegalIdentity /><p>OTLA facilita contactos, proyectos, agenda, comunicaciones y seguimiento de pagos. Estas condiciones no sustituyen las condiciones particulares de cada servicio contratado con el prestador identificado en una orden o reserva.</p></LegalSection>
    <LegalSection title="2. Uso autorizado"><p>Utiliza únicamente cuentas y datos para los que tengas autorización. Protege tus credenciales y reporta accesos no reconocidos. No suplantes identidades, envíes mensajes no solicitados, extraigas información ajena o eludas controles. La autorización de Google es voluntaria y revocable; no hace público tu calendario.</p></LegalSection>
    <LegalSection title="3. Citas"><p>Seleccionar un horario no equivale a confirmar una reserva. Consulta su confirmación y sincronización. Los calendarios externos pueden cambiar o sufrir interrupciones. Las condiciones de cancelación, reprogramación o inasistencia se acuerdan con el prestador; OTLA no impone aquí penalizaciones automáticas.</p></LegalSection>
    <LegalSection title="4. Pagos"><p>Comprueba destinatario, concepto, importe, moneda e instrucciones antes de pagar. Stripe procesa tarjetas; las transferencias dependen de las instrucciones del prestador. Una pantalla de éxito no sustituye la confirmación válida del procesamiento.</p><p>Solicita aclaraciones, devoluciones y correcciones al prestador identificado. Un comprobante de abono no es por sí solo un comprobante fiscal. Estas condiciones no eliminan derechos irrenunciables del consumidor.</p></LegalSection>
    <LegalSection title="5. Comunicaciones y disponibilidad"><p>Quien envía mensajes o documentos debe tener autorización para usar los datos y verificar al destinatario. Correo, WhatsApp y automatización dependen de su configuración y políticas del proveedor. No se garantiza entrega instantánea ni disponibilidad ininterrumpida; pueden requerirse mantenimientos de seguridad.</p></LegalSection>
    <LegalSection title="6. Privacidad y soporte"><p>Consulta el <Link href="/privacidad">aviso de privacidad</Link>. Para soporte o incidencias escribe a <a href="mailto:buenas@chavacervantes.dev">buenas@chavacervantes.dev</a>, sin incluir contraseñas ni datos completos de tarjetas. Los cambios a estas condiciones se publican aquí y no modifican retroactivamente acuerdos particulares de operaciones ya celebradas.</p></LegalSection>
  </article></PublicShell>
}
