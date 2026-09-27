import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
const source=readFileSync(new URL('./client.ts',import.meta.url),'utf8')
 .replace("from './security'",`from '${new URL('./security.ts',import.meta.url).href}'`)
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {sendWhatsAppMessage,sendWhatsAppTemplate}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
test('Twilio sends fail explicitly instead of silently recording a skipped delivery',async()=>{
 const names=['TWILIO_ACCOUNT_SID','TWILIO_AUTH_TOKEN','TWILIO_WHATSAPP_FROM','TWILIO_WEBHOOK_BASE_URL']
 const saved=Object.fromEntries(names.map(key=>[key,process.env[key]]));const originalFetch=global.fetch
 let calls=0
 try {
  delete process.env.TWILIO_ACCOUNT_SID
  global.fetch=async()=>{calls++;throw new Error('must not call')}
  await assert.rejects(sendWhatsAppMessage({to:'8112345678',body:'fixture'}),/no está configurado/)
  process.env.TWILIO_ACCOUNT_SID='ACfixture';process.env.TWILIO_AUTH_TOKEN='fixture';process.env.TWILIO_WHATSAPP_FROM='whatsapp:+14155552671';process.env.TWILIO_WEBHOOK_BASE_URL='https://example.invalid'
  await assert.rejects(sendWhatsAppMessage({to:'invalid',body:'fixture'}),/teléfono/)
  assert.equal(calls,0)
  global.fetch=async()=>new Response(JSON.stringify({message:'private provider diagnostics'}),{status:400})
  await assert.rejects(sendWhatsAppMessage({to:'8112345678',body:'fixture'}),error=>/no aceptó/.test(error.message)&&!error.message.includes('private'))
  global.fetch=async()=>new Response(JSON.stringify({sid:'invalid',status:'queued'}))
  await assert.rejects(sendWhatsAppMessage({to:'8112345678',body:'fixture'}),/no confirmó/)
  global.fetch=async(_url,options)=>{
   assert.equal(options.body.get('ContentSid'),'HXfixture')
   assert.equal(options.body.get('ContentVariables'),JSON.stringify({'1':'Chava Cervantes'}))
   return new Response(JSON.stringify({sid:`SM${'a'.repeat(32)}`,status:'queued'}))
  }
  assert.equal((await sendWhatsAppTemplate({to:'8112345678',contentSid:'HXfixture',variables:{'1':'Chava Cervantes'}})).status,'queued')
 } finally {global.fetch=originalFetch;for(const name of names){if(saved[name]===undefined)delete process.env[name];else process.env[name]=saved[name]}}
})
