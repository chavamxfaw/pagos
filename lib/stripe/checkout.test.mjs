import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { canRetryCreation, checkoutDisposition, reconciliationMessage } from './checkout-state.ts'
import { readLimitedText } from '../security/request-body.ts'

function load(file, deps) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8').replace(/^import .*\n/gm, '')
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText
  return Function('deps', `const {${Object.keys(deps).join(',')}}=deps; const exports={}; ${js}; return exports`)(deps)
}

function fixture({ status = 'pending', checkout, providerStatus = 'open', failRetrieve = false } = {}) {
  const writes = [], creations = [], provider = new Map()
  let row = checkout
  const order = {id:'order',token:'token',client_id:'client',status,total_amount:1000,paid_amount:0,concept:'Fixture',clients:{email:'test@example.invalid'}}
  const request = {id:'request',request_type:'fixed',amount:100,commission_payer:'merchant'}
  const admin = {
    from(table) {
      let change
      const q = {select(){return q},eq(){return q},update(value){change=value; return q},
        async single(){return {data:table==='orders'?order:request}},
        then(resolve){if(change){writes.push(change);Object.assign(row,change)}return Promise.resolve({error:null}).then(resolve)}}
      return q
    },
    async rpc(name,args){
      assert.equal(name,'reserve_stripe_checkout')
      row ??= {id:'reservation',status:'pending',stripe_session_id:'creating:reservation',created_at:new Date().toISOString(),metadata:args.p_metadata}
      return {data:structuredClone(row),error:null}
    },
  }
  const stripe = {checkout:{sessions:{
    async retrieve(){if(failRetrieve)throw Error('network');return {status:providerStatus,url:providerStatus==='open'?'https://checkout.example.invalid':null}},
    async create(params,options){
      creations.push(options.idempotencyKey)
      provider.set(options.idempotencyKey,provider.get(options.idempotencyKey)??{id:'cs_one',status:'open',url:'https://checkout.example.invalid'})
      return provider.get(options.idempotencyKey)
    },
  }}}
  const {POST} = load('../../app/api/stripe/checkout/route.ts', {
    NextResponse:{json:(body,init)=>Response.json(body,init)},createAdminClient:()=>admin,
    enforceIpRateLimit:async()=>null,getStripeSettings:async()=>({enabled:true,mode:'test'}),
    roundMoney:n=>n,calculateStripeChargeAmount:n=>({paymentAmount:n,feeAmount:0,totalCharged:n}),
    getStripeClient:()=>stripe,canRetryCreation,checkoutDisposition,reconciliationMessage,readLimitedText,
  })
  return {run:(body=JSON.stringify({orderId:'72000000-0000-4000-8000-000000000001',token:'token',paymentRequestId:'72000000-0000-4000-8000-000000000002'}))=>POST(new Request('http://localhost/api/stripe/checkout',{method:'POST',body})),writes,creations,provider,get row(){return row}}
}

test('completed provider session blocks another charge and never marks ledger paid', async()=>{
  const f=fixture({checkout:{id:'one',status:'pending',stripe_session_id:'cs_existing',metadata:{}},providerStatus:'complete'})
  assert.equal((await f.run()).status,409)
  assert.equal((await f.run()).status,409)
  assert.equal(f.creations.length,0)
  assert.deepEqual(f.writes,[])
  assert.equal(f.row.status,'pending')
})
test('provider retrieval uncertainty fails closed; cancelled orders never reach Stripe',async()=>{
  const f=fixture({checkout:{id:'one',status:'pending',stripe_session_id:'cs_existing',metadata:{}},failRetrieve:true})
  assert.equal((await f.run()).status,409)
  assert.equal(f.creations.length,0)
  assert.deepEqual(f.writes,[])
  const cancelled=fixture({status:'cancelled'})
  assert.equal((await cancelled.run()).status,409)
  assert.equal(cancelled.row,undefined)
})
test('parallel creation uses one durable provider key and one external session',async()=>{
  const f=fixture()
  const responses=await Promise.all([f.run(),f.run()])
  assert.deepEqual(responses.map(r=>r.status),[200,200])
  assert.equal(f.provider.size,1)
  assert.ok(f.creations.every(key=>key==='checkout:reservation'))
  assert.equal(f.row.stripe_session_id,'cs_one')
})
test('expired idempotency window cannot repeat uncertain provider creation',async()=>{
  const f=fixture({checkout:{id:'one',status:'pending',stripe_session_id:'creating:one',created_at:'2000-01-01',metadata:{create_params:{}}}})
  assert.equal((await f.run()).status,409)
  assert.equal(f.creations.length,0)
  assert.equal(canRetryCreation('invalid'),false)
})
test('paid local checkout and provider complete without payment remain blocked',async()=>{
  const f=fixture({checkout:{id:'one',status:'paid',stripe_session_id:'cs_existing',metadata:{}}})
  assert.equal((await f.run()).status,409)
  assert.equal(f.creations.length,0)
  assert.equal(checkoutDisposition({status:'complete',url:null}),'reconcile')
})
test('completion racing creation attachment cannot return a fresh checkout URL',async()=>{
  const f=fixture({providerStatus:'complete'})
  assert.equal((await f.run()).status,409)
  assert.equal(f.row.status,'pending')
  assert.ok(f.writes.every(value=>value.status!=='paid'))
})
test('malformed, nonobject, invalid identifiers and oversized bodies fail before reservation',async()=>{
  for(const body of ['null','[]','{','{}',JSON.stringify({orderId:[],token:{},amount:'100'})]){
    const f=fixture()
    assert.equal((await f.run(body)).status,400)
    assert.equal(f.row,undefined)
  }
  const f=fixture()
  assert.equal((await f.run('x'.repeat(16001))).status,413)
  assert.equal(f.row,undefined)
})
test('cancellation requires successful provider expiration; completion race cannot cancel',async()=>{
  for(const providerStatus of ['open','complete']){
    const updates=[]
    const q={select(){return q},eq(){return q},update(v){updates.push(v);return q},then(resolve){return Promise.resolve({data:[{id:'one',stripe_session_id:'cs_one',metadata:{mode:'test'}}],error:null}).then(resolve)}}
    const {expireOrderCheckouts}=load('./cancel-order.ts',{
      checkoutDisposition,reconciliationMessage,getStripeClient:()=>({checkout:{sessions:{retrieve:async()=>({id:'cs_one',status:providerStatus}),expire:async()=>({status:'expired'})}}}),
    })
    const action=expireOrderCheckouts({from:()=>q},'order')
    if(providerStatus==='open'){await action;assert.deepEqual(updates,[{status:'expired'}])}
    else {await assert.rejects(action,/confirmación/);assert.deepEqual(updates,[])}
  }
})
