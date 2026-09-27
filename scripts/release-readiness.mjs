import {readFileSync} from 'node:fs'
import {parseEnv} from 'node:util'
import {calendarReadiness} from '../lib/calendar/setup.ts'

const args=process.argv.slice(2)
if(args.length!==2||args[0]!=='--env-file')throw new Error('Uso: node scripts/release-readiness.mjs --env-file RUTA_PRIVADA')
const env=parseEnv(readFileSync(args[1],'utf8'))
const issues=[]
const required=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','NEXT_PUBLIC_APP_URL',
 'RESEND_API_KEY','RESEND_FROM_EMAIL','CRON_SECRET','OTLA_AGENT_API_KEY','OTLA_AGENT_OWNER_ID','PLATFORM_OWNER_USER_ID',
 'TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_WHATSAPP_FROM','TWILIO_PAYMENT_REMINDER_CONTENT_SID']
for(const name of required)if(!env[name]?.trim())issues.push(`Falta ${name}`)
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
for(const name of ['OTLA_AGENT_OWNER_ID','PLATFORM_OWNER_USER_ID'])if(env[name]&&!uuid.test(env[name]))issues.push(`${name} debe ser UUID`)
if(env.OTLA_AGENT_OWNER_ID&&env.PLATFORM_OWNER_USER_ID&&env.OTLA_AGENT_OWNER_ID!==env.PLATFORM_OWNER_USER_ID)issues.push('OpenClaw debe apuntar a tu cuenta maestra en esta instalación personal')
issues.push(...calendarReadiness(env).issues)
for(const name of ['TWILIO_PAYMENT_INSTRUCTIONS_SENDER_CONTENT_SID','TWILIO_DOCUMENT_LINK_SENDER_CONTENT_SID','TWILIO_BOOKING_LINK_SENDER_CONTENT_SID']){
 if(!env[name]?.trim())issues.push(`Pendiente ${name}: sin la plantilla aprobada no se garantiza la firma del remitente fuera de la ventana de conversación`)
}
if(!((env.STRIPE_SECRET_KEY_TEST&&env.STRIPE_WEBHOOK_SECRET_TEST)||(env.STRIPE_SECRET_KEY_LIVE&&env.STRIPE_WEBHOOK_SECRET_LIVE)))issues.push('Falta un par completo de clave Stripe y secreto de webhook para el modo elegido')
console.log(issues.length?'NO LISTO: configuración incompleta para todas las integraciones solicitadas.':'Variables presentes; todavía requiere verificaciones operativas.')
for(const issue of issues)console.log(`- ${issue}`)
console.log('No se consultaron proveedores ni se mostraron secretos. Confirmar: owner en allowlist; mismo modo Stripe en base; plantillas aprobadas; OAuth real; migraciones; backup/restauración y prueba staging. Variables presentes NO significan integración operativa.')
process.exitCode=issues.length?1:0
