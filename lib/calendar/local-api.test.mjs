import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

// No .env, production URLs, provider requests, or existing user credentials.
const config=JSON.parse(execFileSync('npx',['--yes','supabase@2.117.0','status','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}))
assert.equal(new URL(config.API_URL).hostname,'127.0.0.1')
assert.equal(new URL(config.API_URL).port,'54421')
assert.equal(new URL(config.DB_URL).port,'54422')
const options={auth:{persistSession:false,autoRefreshToken:false}}
const admin=createClient(config.API_URL,config.SECRET_KEY||config.SERVICE_ROLE_KEY,options)
const publishable=config.PUBLISHABLE_KEY||config.ANON_KEY
const identities=[],connection=randomUUID(),calendar=randomUUID(),event=randomUUID(),contact=randomUUID(),key=randomUUID()
let passed=0
function check(name,value){assert(value,name);passed++;console.log(`PASS ${name}`)}
async function ok(query){const result=await query;if(result.error)throw new Error(result.error.message);return result.data}
try{
 for(let i=0;i<2;i++){
  const email=`calendar-api-${randomUUID()}@example.invalid`,password=randomUUID()+randomUUID()
  const {user}=await ok(admin.auth.admin.createUser({email,password,email_confirm:true}))
  identities.push({id:user.id,session:createClient(config.API_URL,publishable,options)})
  await ok(admin.from('app_admin_users').insert({user_id:user.id}))
  await ok(identities[i].session.auth.signInWithPassword({email,password}))
 }
 const owner=identities[0].id
 await ok(admin.from('calendar_connections').insert({id:connection,owner_user_id:owner,account_email:'fixture@example.invalid',refresh_token_encrypted:'not-a-provider-token'}))
 await ok(admin.from('connected_calendars').insert({id:calendar,owner_user_id:owner,connection_id:connection,google_calendar_id:'local-fixture',name:'Local fixture',access_role:'owner'}))
 await ok(admin.from('booking_event_types').insert({id:event,owner_user_id:owner,title:'Local fixture',destination_calendar_id:calendar,weekdays:[1,2,3,4,5,6,7],notice_hours:0,start_hour:0,end_hour:24,timezone:'UTC',buffer_minutes:0}))
 const email=`existing-${randomUUID()}@example.invalid`
 await ok(admin.from('clients').insert({id:contact,name:'Existing fixture contact',email}))
 const start=new Date(Date.now()+2*86400000);start.setUTCHours(12,0,0,0)
 const input={p_event_type:event,p_start:start.toISOString(),p_name:'Unverified visitor',p_email:email,p_phone:'',p_notes:'Synthetic fixture',p_key:key,p_hash:'local-test'}
 const booking=await ok(admin.rpc('reserve_calendar_booking',input))
 check('public guest email never links an existing contact',booking.client_id===null&&booking.contact_link_status==='unverified')
 const contacts=await ok(admin.from('clients').select('id').eq('email',email))
 check('public booking creates no CRM contact',contacts.length===1&&contacts[0].id===contact)
 const replay=await ok(admin.rpc('reserve_calendar_booking',input))
 check('public reservation replay remains idempotent',replay.id===booking.id)
 const ownerRows=await ok(identities[0].session.from('calendar_bookings').select('id,contact_link_status').eq('id',booking.id))
 check('owner can review unverified guest',ownerRows.length===1&&ownerRows[0].contact_link_status==='unverified')
 const otherRows=await ok(identities[1].session.from('calendar_bookings').select('id').eq('id',booking.id))
 check('different admin cannot read guest booking',otherRows.length===0)
 const forged=await admin.rpc('approve_calendar_booking_contact',{p_booking:booking.id,p_owner:identities[1].id,p_client:contact})
 check('wrong owner cannot approve association',forged.error?.code==='42501')
 await ok(admin.rpc('approve_calendar_booking_contact',{p_booking:booking.id,p_owner:owner,p_client:contact}))
 await ok(admin.rpc('approve_calendar_booking_contact',{p_booking:booking.id,p_owner:owner,p_client:contact}))
 const approved=await ok(admin.from('calendar_bookings').select('client_id,contact_link_status,contact_approved_by,contact_approved_at').eq('id',booking.id).single())
 check('owner approval is explicit, audited, and idempotent',approved.client_id===contact&&approved.contact_link_status==='approved'&&approved.contact_approved_by===owner&&approved.contact_approved_at)
 const claim=await ok(admin.rpc('claim_calendar_booking_work',{p_booking:booking.id,p_owner:owner,p_operation:'sync'}))
 const duplicate=await ok(admin.rpc('claim_calendar_booking_work',{p_booking:booking.id,p_owner:owner,p_operation:'sync',p_manual:true}))
 check('live claim prevents a duplicate manual worker',claim.sync_claim_token&&duplicate===null)
 const failed=await ok(admin.rpc('finish_calendar_booking_work',{p_booking:booking.id,p_claim:claim.sync_claim_token,p_success:false}))
 check('failed sync receives a future retry',failed.status==='sync_failed'&&Date.parse(failed.next_retry_at)>Date.now())
 const early=await ok(admin.rpc('claim_calendar_booking_work',{p_booking:booking.id,p_owner:owner,p_operation:'sync'}))
 check('automatic retry respects backoff',early===null)
 const stale=await ok(admin.rpc('finish_calendar_booking_work',{p_booking:booking.id,p_claim:claim.sync_claim_token,p_success:true,p_google_event_id:'stale-fixture'}))
 check('finished claim cannot overwrite state',stale===null)
}finally{
 // Only these generated IDs, never blanket-delete contacts or existing demo users.
 for(const table of ['calendar_bookings','booking_event_types','connected_calendars','calendar_connections']){
  if(identities.length)await ok(admin.from(table).delete().in('owner_user_id',identities.map(i=>i.id)))
 }
 await ok(admin.from('clients').delete().eq('id',contact))
 for(const identity of identities){await identity.session.auth.signOut({scope:'local'});await ok(admin.from('app_admin_users').delete().eq('user_id',identity.id));await ok(admin.auth.admin.deleteUser(identity.id))}
}
console.log(`RESULT ${passed} local API checks passed; generated fixtures cleaned; no provider requests.`)
