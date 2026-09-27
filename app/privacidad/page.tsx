import type { Metadata } from 'next'
import { PublicShell, LegalSection } from '@/components/public-shell'
import { LegalIdentity } from '@/components/legal-identity'

export const metadata: Metadata = { title: 'Aviso de privacidad', description: 'Datos, finalidades, Google Calendar y opciones de privacidad en OTLA.' }

export default function PrivacyPage() {
  return <PublicShell><article className="max-w-3xl space-y-8">
    <header><p className="text-sm text-primary">Transparencia</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Aviso de privacidad</h1><p className="mt-3 text-sm text-muted-foreground">Última actualización: 27 de septiembre de 2026</p></header>
    <LegalSection title="1. Responsable y contacto"><LegalIdentity /></LegalSection>
    <LegalSection title="2. Datos y finalidades">
      <p>Según la función utilizada, OTLA trata nombre, correo, teléfono, datos de empresa, notas, proyectos, citas y comunicaciones que proporcionas tú o el prestador del servicio. Para pagos se registran conceptos, importes, abonos, estados, referencias, datos bancarios de cobro y documentos fiscales cuando se facilitan.</p>
      <p>Se usan para gestionar relaciones comerciales, servicios, disponibilidad y reservas; dar seguimiento a pagos; enviar comunicaciones y documentos solicitados; autenticar usuarios y prevenir abuso. También se procesan registros técnicos, errores, identificadores de sesión y direcciones IP para operar y proteger el servicio.</p>
      <p>Stripe procesa las tarjetas: OTLA no solicita ni almacena su número completo o código de seguridad. No incluyas contraseñas, información de salud u otros datos sensibles en notas. Este aviso no autoriza publicidad ajena a las funciones solicitadas ni la venta de información. Las finalidades adicionales que requieran consentimiento se informarán por separado.</p>
    </LegalSection>
    <div id="google" className="scroll-mt-6"><LegalSection title="3. Conexión con Google Calendar">
      <p>La conexión es opcional. Al pulsar Conectar Google eliges tu cuenta y Google te muestra los permisos; OTLA no recibe tu contraseña. Puedes conectar varias cuentas.</p>
      <ul><li><strong>Lista de calendarios:</strong> identificadores, nombres y permisos para elegir cuáles utilizar.</li><li><strong>Disponibilidad:</strong> intervalos ocupados para evitar reservas incompatibles.</li><li><strong>Eventos:</strong> OTLA consulta los eventos del periodo mostrado en tu agenda y presenta sus títulos, fechas y calendario de origen a tu usuario autorizado. También crea, comprueba y cancela eventos vinculados a reservas, con nombre y correo del invitado, horario y notas. Google puede enviar invitaciones y actualizaciones a los asistentes.</li></ul>
      <p>Guardamos configuración e identificadores de calendarios, datos de reservas e identificadores de eventos. Los tokens de renovación se guardan cifrados en el servidor. Los intervalos ocupados se consultan para calcular disponibilidad; no se muestran a otros clientes como una copia de tu agenda personal.</p>
      <p>El uso y la transferencia de datos recibidos de Google se sujetan a la <a href="https://developers.google.com/terms/api-services-user-data-policy">Política de Datos del Usuario de los Servicios de las APIs de Google</a> y sus restricciones de uso limitado. No se venden ni se usan para publicidad, evaluación crediticia o entrenamiento de modelos de inteligencia artificial de propósito general. El acceso humano se limita a tu autorización específica, seguridad, obligaciones legales y las excepciones permitidas por esa política.</p>
      <p>Puedes retirar el permiso en <a href="https://myaccount.google.com/connections">las conexiones de tu cuenta de Google</a>. Esto impide nuevas operaciones autorizadas, pero no borra automáticamente reservas ni eventos previos. Para eliminar datos de conexión o reservas, escribe al contacto de privacidad. Retirar acceso puede impedir comprobar disponibilidad y sincronizar citas.</p>
    </LegalSection></div>
    <LegalSection title="4. Proveedores y destinatarios">
      <p>Vercel aloja la aplicación; Supabase proporciona base de datos, autenticación y almacenamiento; Stripe procesa pagos; Resend envía correos; y Twilio y WhatsApp participan en mensajes cuando están configurados. Google procesa las operaciones de Calendar autorizadas. Los datos necesarios pueden tratarse en infraestructura fuera de México conforme a los servicios contratados.</p>
      <p>Los mensajes, enlaces y documentos se comparten con el destinatario indicado por el usuario autorizado. Protege los enlaces privados: quien los reciba puede acceder a la información que habilitan. La API y OpenClaw se reservan a las operaciones habilitadas de la cuenta maestra; no conceden acceso general a calendarios ajenos.</p>
      <p>Los datos de Google no se ceden a proveedores para fines ajenos a las funciones informadas. Otras comunicaciones sujetas a consentimiento se informarán antes de realizarse; los requerimientos de autoridades competentes se atenderán conforme a la normativa aplicable.</p>
    </LegalSection>
    <LegalSection title="5. Conservación y seguridad">
      <p>Conservamos información mientras sea necesaria para el servicio, resolver controversias o cumplir obligaciones aplicables. Cancelar una cita o retirar OAuth no elimina por sí solo todos los registros. Puedes solicitar eliminación por correo; verificaremos tu identidad de forma proporcional y explicaremos cualquier excepción de conservación.</p>
      <p>Los respaldos pueden mantener copias restringidas hasta su sustitución dentro del ciclo operativo. No se promete eliminación instantánea de todas las copias. Aplicamos controles de acceso y protección de credenciales, sin garantizar la ausencia absoluta de incidentes. No compartas tu sesión ni claves de automatización.</p>
    </LegalSection>
    <LegalSection title="6. Derechos y preferencias">
      <p>Para solicitar acceso, rectificación, cancelación u oposición, revocar consentimiento o limitar el uso de tus datos, escribe a <a href="mailto:buenas@chavacervantes.dev">buenas@chavacervantes.dev</a> con el asunto Privacidad OTLA. Indica nombre, medio de respuesta, datos involucrados y lo que solicitas; para rectificaciones, el cambio y su soporte. No envíes identificaciones hasta que se te indique un medio apropiado.</p>
      <p>Atenderemos los requisitos y plazos legales aplicables tras verificar la titularidad o representación. Retirar consentimiento no modifica tratamientos previos legítimos ni obligaciones de conservación. Informaremos si tu solicitud impide continuar una función.</p>
    </LegalSection>
    <LegalSection title="7. Cookies y cambios">
      <p>Utilizamos cookies de sesión y almacenamiento técnico para autenticación, seguridad y preferencias. La versión instalable puede guardar recursos estáticos; esa caché no es un respaldo de información privada. Bloquear cookies puede impedir iniciar sesión.</p>
      <p>Los cambios se publicarán aquí con su fecha. Los nuevos usos de datos de Google o tratamientos que requieran consentimiento se informarán antes de aplicarse.</p>
    </LegalSection>
  </article></PublicShell>
}
