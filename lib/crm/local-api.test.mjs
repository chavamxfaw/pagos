// Dedicated local Supabase integration test. Never loads .env or production credentials.
import { execFileSync,spawn,spawnSync } from 'node:child_process'
import { randomBytes,randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import { createClient } from '@supabase/supabase-js'

const config=JSON.parse(execFileSync('npx',['--yes','supabase@2.117.0','status','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}))
assert.equal(config.API_URL,'http://127.0.0.1:54421','Use only pagos-crm-local')
assert.equal(new URL(config.DB_URL).port,'54422')
const key=config.PUBLISHABLE_KEY||config.ANON_KEY
const options={auth:{persistSession:false,autoRefreshToken:false}}
const admin=createClient(config.API_URL,config.SECRET_KEY||config.SERVICE_ROLE_KEY,options)
const owner=createClient(config.API_URL,key,options)
const anonymous=createClient(config.API_URL,key,options)
const users=[],records=[]
const marker=`API fixture ${Date.now()}`
let failures=0,passes=0
async function check(name,fn){try{await fn();passes++;console.log(`PASS ${name}`)}catch(error){failures++;console.log(`FAIL ${name}: ${error instanceof Error?error.message:'unknown'}`)}}
function noError(result){assert.equal(result.error,null,result.error?.message);return result.data}
function concurrentSql(query){return new Promise(resolve=>{const child=spawn('psql',[config.DB_URL,'-v','ON_ERROR_STOP=1','-q','-c',query],{stdio:['ignore','pipe','pipe']});child.stdout.resume();child.stderr.resume();child.on('close',code=>resolve(code))})}
async function insert(db,table,payload){const row=noError(await db.from(table).insert(payload).select().single());records.push({table,id:row.id});return row}
async function loginFixture(isAdmin){
 const password=randomBytes(24).toString('base64url'),email=`qa-${randomBytes(8).toString('hex')}@pagos.test`
 const u=noError(await admin.auth.admin.createUser({email,password,email_confirm:true})).user;users.push(u.id)
 if(isAdmin)noError(await admin.from('app_admin_users').insert({user_id:u.id}))
 const session=createClient(config.API_URL,key,options)
 noError(await session.auth.signInWithPassword({email,password}))
 return {session,id:u.id}
}
try{
 const auth=noError(await owner.auth.signInWithPassword({email:'vista-local@pagos.test',password:process.env.PAGOS_TEST_DEMO_PASSWORD||''}))
 const ownerId=auth.user.id
 console.log('PASS existing local owner login (password/session unchanged)');passes++
 const other=await loginFixture(true),nonAdmin=await loginFixture(false)
 const contact=await insert(owner,'clients',{name:marker,email:`qa-contact-${Date.now()}@pagos.test`})
 const contact2=await insert(owner,'clients',{name:`${marker} other`,email:`qa-other-${Date.now()}@pagos.test`})
 const modules=['crm_opportunities','crm_projects','crm_tasks','crm_proposals','crm_renewals']
 for(const table of modules){
  const row=await insert(owner,table,{owner_user_id:ownerId,client_id:contact.id,title:marker})
  await check(`${table}: owner edit/read`,async()=>{const edited=noError(await owner.from(table).update({title:`${marker} edited`}).eq('id',row.id).select().single());assert.equal(edited.title,`${marker} edited`)})
  await check(`${table}: second admin cannot read/update/delete`,async()=>{
   assert.deepEqual(noError(await other.session.from(table).select('id').eq('id',row.id)),[])
   assert.deepEqual(noError(await other.session.from(table).update({title:'forbidden'}).eq('id',row.id).select('id')),[])
   assert.deepEqual(noError(await other.session.from(table).delete().eq('id',row.id).select('id')),[])
  })
  await check(`${table}: forged owner and nonadmin writes denied`,async()=>{
   assert.ok((await owner.from(table).insert({owner_user_id:other.id,title:'forbidden'})).error)
   assert.ok((await nonAdmin.session.from(table).insert({owner_user_id:nonAdmin.id,title:'forbidden'})).error)
   assert.deepEqual(noError(await nonAdmin.session.from(table).select('id').eq('id',row.id)),[])
  })
  await check(`${table}: anonymous access denied`,async()=>{assert.ok((await anonymous.from(table).select('id').eq('id',row.id)).error)})
 }
 const opportunity=await insert(owner,'crm_opportunities',{owner_user_id:ownerId,client_id:contact.id,title:`${marker} won`,status:'won',value_amount:2500})
 let project
 await check('won opportunity conversion preserves value and is idempotent',async()=>{
  const first=noError(await owner.rpc('crm_convert_opportunity',{p_owner:ownerId,p_opportunity:opportunity.id}))
  records.push({table:'crm_projects',id:first.project_id})
  const second=noError(await owner.rpc('crm_convert_opportunity',{p_owner:ownerId,p_opportunity:opportunity.id}))
  assert.equal(first.project_id,second.project_id);assert.equal(second.replayed,true)
  project=noError(await owner.from('crm_projects').select('*').eq('id',first.project_id).single())
  assert.equal(project.budget_amount,2500);assert.equal(project.client_id,contact.id)
 })
 await check('conversion cannot impersonate owner from another admin',async()=>{assert.ok((await other.session.rpc('crm_convert_opportunity',{p_owner:ownerId,p_opportunity:opportunity.id})).error)})
 await check('order with matching project/contact succeeds',async()=>{await insert(owner,'orders',{client_id:contact.id,concept:marker,total_amount:100,subtotal_amount:100,crm_project_id:project.id})})
 await check('order with mismatched project/contact rejected',async()=>{assert.ok((await owner.from('orders').insert({client_id:contact2.id,concept:'wrong client',total_amount:100,subtotal_amount:100,crm_project_id:project.id})).error)})
 await check('task cannot reference another owner project',async()=>{assert.ok((await other.session.from('crm_tasks').insert({owner_user_id:other.id,client_id:contact.id,title:'forbidden',project_id:project.id})).error)})
 await check('task cannot reference a different contact project through Data API',async()=>{
  const result=await owner.from('crm_tasks').insert({owner_user_id:ownerId,client_id:contact2.id,title:'wrong client',project_id:project.id}).select().maybeSingle()
  if(result.data)records.push({table:'crm_tasks',id:result.data.id})
  assert.ok(result.error,'Data API accepted task linked to project of another contact')
 })
  await check('project contact cannot change underneath a linked order',async()=>{
  const result=await owner.from('crm_projects').update({client_id:contact2.id}).eq('id',project.id).select().maybeSingle()
  if(!result.error)await admin.from('crm_projects').update({client_id:contact.id}).eq('id',project.id)
  assert.ok(result.error,'Data API accepted project contact reassignment leaving order on previous contact')
 })
 if(process.env.PAGOS_TEST_OBSERVED_CLIENT_ID) await check('browser QA contact remains visible through owner Data API',async()=>{
  const result=await owner.from('clients').select('*').eq('id',process.env.PAGOS_TEST_OBSERVED_CLIENT_ID).maybeSingle()
  noError(result);assert.ok(result.data,'Existing browser QA contact missing')
 })
 for(const childTable of ['orders','crm_tasks','crm_proposals']){
  await check(`standalone project contact protected by ${childTable}`,async()=>{
   const parent=await insert(owner,'crm_projects',{owner_user_id:ownerId,client_id:contact.id,title:`${marker} parent ${childTable}`})
   await insert(owner,childTable,childTable==='orders'?{client_id:contact.id,concept:marker,total_amount:100,subtotal_amount:100,crm_project_id:parent.id}:{owner_user_id:ownerId,client_id:contact.id,title:marker,project_id:parent.id})
   assert.ok((await owner.from('crm_projects').update({client_id:contact2.id}).eq('id',parent.id)).error,'Reverse contact reassignment accepted')
  })
 }
 for(const childTable of ['crm_tasks','crm_proposals']){
  await check(`${childTable}: opportunity same-contact and reverse edit`,async()=>{
   const parent=await insert(owner,'crm_opportunities',{owner_user_id:ownerId,client_id:contact.id,title:marker})
   const bad=await owner.from(childTable).insert({owner_user_id:ownerId,client_id:contact2.id,title:'mismatched',opportunity_id:parent.id}).select().maybeSingle()
   if(bad.data)records.push({table:childTable,id:bad.data.id})
   assert.ok(bad.error,'Mismatched opportunity contact accepted')
   await insert(owner,childTable,{owner_user_id:ownerId,client_id:contact.id,title:marker,opportunity_id:parent.id})
   assert.ok((await owner.from('crm_opportunities').update({client_id:contact2.id}).eq('id',parent.id)).error,'Reverse opportunity contact reassignment accepted')
  })
 }
 await check('NULL-contact relationships remain valid; mixed NULL/contact rejected',async()=>{
  const parent=await insert(owner,'crm_projects',{owner_user_id:ownerId,title:marker,client_id:null})
  await insert(owner,'crm_tasks',{owner_user_id:ownerId,title:marker,client_id:null,project_id:parent.id})
  await insert(owner,'crm_proposals',{owner_user_id:ownerId,title:marker,client_id:null,project_id:parent.id})
  assert.ok((await owner.from('crm_tasks').insert({owner_user_id:ownerId,title:'mixed null',client_id:contact.id,project_id:parent.id})).error)
  assert.ok((await owner.from('crm_projects').update({client_id:contact.id}).eq('id',parent.id)).error)
 })
 await check('contact deletion preserves ON DELETE SET NULL across linked CRM',async()=>{
  const disposable=await insert(owner,'clients',{name:marker,email:`null-${Date.now()}@pagos.test`})
  const opp=await insert(owner,'crm_opportunities',{owner_user_id:ownerId,client_id:disposable.id,title:marker})
  const proj=await insert(owner,'crm_projects',{owner_user_id:ownerId,client_id:disposable.id,title:marker,source_opportunity_id:opp.id})
  const task=await insert(owner,'crm_tasks',{owner_user_id:ownerId,client_id:disposable.id,title:marker,project_id:proj.id,opportunity_id:opp.id})
  const proposal=await insert(owner,'crm_proposals',{owner_user_id:ownerId,client_id:disposable.id,title:marker,project_id:proj.id,opportunity_id:opp.id})
  noError(await owner.from('clients').delete().eq('id',disposable.id))
  for(const [table,id] of [['crm_opportunities',opp.id],['crm_projects',proj.id],['crm_tasks',task.id],['crm_proposals',proposal.id]])assert.equal(noError(await owner.from(table).select('client_id').eq('id',id).single()).client_id,null)
 })
 await check('concurrent order creation and project contact change cannot break relation',async()=>{
  const parent=await insert(owner,'crm_projects',{owner_user_id:ownerId,client_id:contact.id,title:`${marker} race`})
  const orderId=randomUUID();records.push({table:'orders',id:orderId})
  const results=await Promise.all([
   concurrentSql(`begin;set local role service_role;insert into public.orders(id,client_id,concept,total_amount,subtotal_amount,crm_project_id) values('${orderId}','${contact.id}','Concurrent fixture',100,100,'${parent.id}');select pg_sleep(0.2);commit;`),
   concurrentSql(`begin;set local role service_role;update public.crm_projects set client_id='${contact2.id}' where id='${parent.id}';select pg_sleep(0.2);commit;`),
  ])
  assert.equal(results.filter(code=>code===0).length,1,'Competing writes both succeeded or both failed')
  const current=noError(await owner.from('crm_projects').select('client_id').eq('id',parent.id).single())
  const order=noError(await owner.from('orders').select('client_id').eq('id',orderId).maybeSingle())
  if(order)assert.equal(order.client_id,current.client_id)
  else assert.equal(current.client_id,contact2.id)
 })
 for(const table of ['calendar_connections','payment_operations','payment_receipt_deliveries','whatsapp_status_events','platform_accounts']){
  await check(`${table}: private storage unavailable to authenticated Data API`,async()=>{assert.ok((await owner.from(table).select('*').limit(1)).error)})
 }
 for(const path of ['lib/crm/rls.test.sql','lib/crm/workflow.test.sql','lib/payments/transactions.test.sql']){
  await check(`SQL rollback ${path}`,async()=>{const result=spawnSync('psql',[config.DB_URL,'-v','ON_ERROR_STOP=1','-q','-f',path],{encoding:'utf8'});assert.equal(result.status,0,result.stderr)})
 }
}finally{
 // Only remove IDs created by this test; order avoids linked-record constraints.
 const tables=['crm_tasks','crm_proposals','crm_renewals','orders','crm_projects','crm_opportunities','clients']
 for(const table of tables){const ids=records.filter(r=>r.table===table).map(r=>r.id);if(ids.length){const result=await admin.from(table).delete().in('id',ids);if(result.error){failures++;console.log(`FAIL cleanup ${table}: ${result.error.code}`)}}}
 for(const id of users){await admin.from('app_admin_users').delete().eq('user_id',id);const result=await admin.auth.admin.deleteUser(id);if(result.error){failures++;console.log('FAIL cleanup synthetic auth user')}}
 await owner.auth.signOut({scope:'local'})
 console.log(`RESULT ${passes} passed; ${failures} failed. Synthetic test records cleaned; existing owner unchanged.`)
 if(failures)process.exitCode=1
}
