import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
const source = readFileSync(new URL('./delivery.ts',import.meta.url),'utf8').replace("import 'server-only'",'')
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText
const {deliverReceiptOnce}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
function fixture(status='pending') {
 const row={status}; let failClaim=false
 const admin={from:()=>({update:values=>{
  const filters=[]
  const execute=()=>{
   if(failClaim)return {data:null,error:{message:'database unavailable'}}
   if(filters.some(([key,value])=>key==='status'&&row.status!==value))return {data:null,error:null}
   Object.assign(row,values); return {data:{payment_id:'fixture'},error:null}
  }
  const q={eq:(key,value)=>{filters.push([key,value]);return q},select:()=>q,maybeSingle:async()=>execute(),then:(resolve)=>Promise.resolve(execute()).then(resolve)}
  return q
 }})}
 return {row,admin,fail:()=>{failClaim=true}}
}
test('concurrent/replayed receipt delivery sends once',async()=>{
 const f=fixture();let sends=0
 await Promise.all([1,2,3].map(()=>deliverReceiptOnce(f.admin,'fixture','email',true,async()=>{sends++;return 'id'})))
 assert.equal(sends,1);assert.equal(f.row.status,'sent')
})
test('ambiguous failure never retries and disabled channel never sends',async()=>{
 const f=fixture();let sends=0
 const send=async()=>{sends++;throw new Error('timeout')}
 await deliverReceiptOnce(f.admin,'fixture','email',true,send)
 await deliverReceiptOnce(f.admin,'fixture','email',true,send)
 assert.equal(sends,1);assert.equal(f.row.status,'unknown')
 const disabled=fixture();await deliverReceiptOnce(disabled.admin,'fixture','email',false,send)
 assert.equal(disabled.row.status,'skipped');assert.equal(sends,1)
})
test('provider callback cannot be regressed by a late timeout',async()=>{
 const f=fixture()
 await deliverReceiptOnce(f.admin,'fixture','whatsapp',true,async()=>{f.row.status='sent';throw new Error('response lost')})
 assert.equal(f.row.status,'sent')
})
test('failed atomic claim never contacts provider',async()=>{
 const f=fixture();f.fail();let sends=0
 await assert.rejects(deliverReceiptOnce(f.admin,'fixture','email',true,async()=>{sends++}),/queue/)
 assert.equal(sends,0)
})
