// Local-only launcher: no production keys or authentication bypasses.
import {execFileSync,spawn} from 'node:child_process'
import {randomBytes} from 'node:crypto'
import {createClient} from '@supabase/supabase-js'
import {readFileSync} from 'node:fs'
import {parseEnv} from 'node:util'
import {localCalendarEnvironment} from './calendar-local-env.mjs'
const args=process.argv.slice(2)
if(args.some(arg=>arg!=='--google-calendar'))throw new Error('Usa npm run dev:local o npm run dev:local -- --google-calendar')
const googleOptIn=args.includes('--google-calendar')
// A dedicated ignored file prevents accidentally inheriting production OAuth credentials.
const calendarEnv=localCalendarEnvironment(googleOptIn,googleOptIn?parseEnv(readFileSync('.env.calendar.local','utf8')):{})
const config=JSON.parse(execFileSync('npx',['--yes','supabase@2.117.0','status','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}))
const url=config.API_URL
if(url!=='http://127.0.0.1:54421')throw new Error('Expected the isolated Pagos local API at port 54421')
const serverKey=config.SECRET_KEY||config.SERVICE_ROLE_KEY,publicKey=config.PUBLISHABLE_KEY||config.ANON_KEY
const db=createClient(url,serverKey,{auth:{persistSession:false,autoRefreshToken:false}})
const email='vista-local@pagos.test',password=randomBytes(18).toString('base64url')
const listed=await db.auth.admin.listUsers({perPage:1000})
if(listed.error)throw listed.error
const existing=listed.data.users.find(u=>u.email===email)
const result=existing?await db.auth.admin.updateUserById(existing.id,{password,email_confirm:true}):await db.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{name:'Vista local de Pagos'}})
if(result.error)throw result.error
const owner=result.data.user.id
const allowed=await db.from('app_admin_users').upsert({user_id:owner})
if(allowed.error)throw allowed.error
const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:url,NEXT_PUBLIC_SUPABASE_ANON_KEY:publicKey,SUPABASE_SERVICE_ROLE_KEY:serverKey,NEXT_PUBLIC_APP_URL:'http://localhost:3002',PLATFORM_OWNER_USER_ID:owner,OTLA_AGENT_OWNER_ID:owner}
for(const name of ['RESEND_API_KEY','TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_WHATSAPP_FROM','STRIPE_SECRET_KEY_TEST','STRIPE_SECRET_KEY_LIVE','GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','CALENDAR_TOKEN_KEY','CRON_SECRET','OTLA_AGENT_API_KEY'])env[name]=''
Object.assign(env,calendarEnv)
console.log(googleOptIn?'Google OAuth local habilitado. Conecta manualmente una cuenta de prueba desde Agenda; otros proveedores siguen deshabilitados.':'Google OAuth local deshabilitado. Para habilitarlo explícitamente: npm run dev:local -- --google-calendar')
console.log(`Acceso exclusivamente local\nCorreo: ${email}\nContraseña: ${password}\nURL: http://localhost:3002`)
const child=spawn('node',['node_modules/next/dist/bin/next','dev','--webpack','-p','3002','-H','127.0.0.1'],{env,stdio:'inherit'})
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal))
child.on('exit',code=>process.exit(code??0))
