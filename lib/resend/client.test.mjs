import test from 'node:test'
import assert from 'node:assert/strict'
import { sendEmailChecked } from './client.ts'

test('provider rejection never reaches success bookkeeping and hides provider details', async () => {
 let recorded = false
 await assert.rejects(async () => {
  await sendEmailChecked(async () => ({data:null,error:{message:'private provider diagnostics',name:'validation_error'}}), {})
  recorded = true
 }, error => /no confirmó/.test(error.message) && !error.message.includes('private'))
 assert.equal(recorded,false)
})

test('missing acknowledgement and network errors cannot report delivery', async () => {
 await assert.rejects(sendEmailChecked(async () => ({data:null,error:null}), {}), /no confirmó/)
 await assert.rejects(sendEmailChecked(async () => {throw new Error('private timeout details')}, {}), /no confirmó/)
})

test('accepted delivery preserves provider id and idempotency options', async () => {
 const options = {idempotencyKey:'receipt/fixture'}
 const result = await sendEmailChecked(async (body, actual) => {
  assert.equal(actual,options)
  return {data:{id:'fixture-email'},error:null}
 }, {to:'test@example.invalid'}, options)
 assert.equal(result.data.id,'fixture-email')
})

test('missing optional email configuration does not crash module import',async()=>{
 const saved=process.env.RESEND_API_KEY
 delete process.env.RESEND_API_KEY
 try{
  const {resend}=await import('./client.ts')
  assert.ok(resend)
  assert.throws(()=>resend.emails,/correo no está configurado/)
 }finally{if(saved!==undefined)process.env.RESEND_API_KEY=saved}
})
