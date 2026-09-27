// Read-only HTTP smoke against the isolated local app. No real provider actions.
import assert from 'node:assert/strict'
import {execFileSync} from 'node:child_process'
import {createServerClient} from '@supabase/ssr'

const app='http://127.0.0.1:3002'
const config=JSON.parse(execFileSync('npx',['--yes','supabase@2.117.0','status','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}))
assert.equal(config.API_URL,'http://127.0.0.1:54421','Never run against a remote instance')
assert.ok(process.env.PAGOS_TEST_DEMO_PASSWORD,'Set local fixture password')
const jar=new Map()
const db=createServerClient(config.API_URL,config.PUBLISHABLE_KEY||config.ANON_KEY,{
 cookies:{getAll:()=>Array.from(jar,([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value})=>jar.set(name,value))},
})
const {error}=await db.auth.signInWithPassword({email:'vista-local@pagos.test',password:process.env.PAGOS_TEST_DEMO_PASSWORD})
assert.equal(error,null,'Local fixture login failed')
const headers={cookie:Array.from(jar,([key,value])=>`${key}=${value}`).join('; ')}
let checks=0
for(const [path,expected] of [
 ['/admin','Mi espacio'],['/admin/calendar','Conectar Google'],['/admin/messages','Recibos por revisar'],
 ['/admin/clients','Contactos'],['/admin/orders','Órdenes'],['/admin/profile','Mi perfil'],
 ['/admin/crm/opportunities','Oportunidades'],['/admin/reports','Resumen financiero'],['/admin/platform','Plataforma'],
]) {
 const response=await fetch(`${app}${path}`,{headers,redirect:'manual'})
 assert.equal(response.status,200,`${path} HTTP ${response.status}`)
 const html=await response.text()
 assert.ok(html.includes(expected),`${path} missing ${expected}`)
 assert.ok(!html.includes('NEXT_HTTP_ERROR_FALLBACK;500'),`${path} server error`)
 checks++;console.log(`PASS ${path}`)
 if(path==='/admin/calendar'){
  assert.match(html,/Conexión pendiente|configur|Configura/)
  assert.ok(html.includes('disabled'),'Unconfigured OAuth must not launch')
 }
}
for(const [path,pattern] of [
 ['/p/252e39f7-3220-4476-a7fb-b0631b0b0b18',/10,000/],
 ['/r/9c553a8b-efb0-42fd-88fb-8f86dd0886fe',/5,000/],
 ['/admin/calendar?error=connection',/No se pudo completar la conexión/],
 ['/admin/calendar?connected=1',/conectad/],
]){
 const response=await fetch(`${app}${path}`,{headers,redirect:'manual'})
 assert.equal(response.status,200,path);assert.match(await response.text(),pattern,path)
 checks++;console.log(`PASS ${path.split('?')[0]} state`)
}
const denied=await fetch(`${app}/admin/messages`,{redirect:'manual'})
assert.ok([302,303,307,308].includes(denied.status),'Anonymous admin must redirect')
assert.ok(denied.headers.get('location')?.includes('/login'));checks++
const manifest=await (await fetch(`${app}/manifest.json`)).json()
assert.equal(manifest.name,'OTLA')
for(const icon of manifest.icons){assert.equal((await fetch(`${app}${icon.src}`)).status,200)}
checks++
console.log(`HTTP smoke: ${checks} checks passed. No messages or charges sent.`)
