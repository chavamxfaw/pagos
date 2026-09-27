import { spawn,spawnSync } from 'node:child_process'
import assert from 'node:assert/strict'

const dsn=process.env.TEST_DATABASE_URL
if(!dsn||new URL(dsn).hostname!=='127.0.0.1'||new URL(dsn).port!=='55439') throw new Error('Use the disposable local fixture database on port 55439')
const actor='72000000-0000-4000-8000-000000000001',client='72000000-0000-4000-8000-000000000002',order='72000000-0000-4000-8000-000000000003'
function sql(query){const r=spawnSync('psql',[dsn,'-v','ON_ERROR_STOP=1','-At','-c',query],{encoding:'utf8'});if(r.status)throw new Error(r.stderr);return r.stdout.trim()}
function parallelSql(query){return new Promise(resolve=>{const p=spawn('psql',[dsn,'-v','ON_ERROR_STOP=1','-At','-c',query]);let out='',err='';p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>err+=x);p.on('close',code=>resolve({code,out,err}))})}
const payload=amount=>JSON.stringify({order_id:order,amount,concept:'Concurrency fixture',payment_method:'transfer',paid_at:'2026-09-10'})
const call=(key,amount)=>`begin;set local role service_role;select public.record_agent_payment('${key}','${actor}','${payload(amount)}'::jsonb)->'payment'->>'id';select pg_sleep(0.2);commit;`
try{
  sql(`insert into auth.users(id,email) values('${actor}','concurrency@fixture.test');insert into public.app_admin_users(user_id) values('${actor}');insert into public.clients(id,name,email) values('${client}','Concurrent fixture','concurrent@fixture.test');insert into public.orders(id,client_id,concept,total_amount,subtotal_amount) values('${order}','${client}','Concurrent order',1000,1000);`)
  const replay=await Promise.all([parallelSql(call('concurrent-same-key',100)),parallelSql(call('concurrent-same-key',100))])
  assert.ok(replay.every(r=>r.code===0),JSON.stringify(replay))
  assert.equal(sql(`select count(*) from public.payments where order_id='${order}'`),'1')
  const competing=await Promise.all([parallelSql(call('concurrent-key-001',600)),parallelSql(call('concurrent-key-002',600))])
  assert.equal(competing.filter(r=>r.code===0).length,1,JSON.stringify(competing))
  assert.equal(sql(`select paid_amount from public.orders where id='${order}'`),'700.00')
  assert.equal(sql(`select sum(amount) from public.payments where order_id='${order}'`),'700.00')
  console.log('PASS concurrent same-key deduplication; competing payments reject overpayment; balance equals ledger')
}finally{
  sql(`delete from public.payment_operations where payment_id in(select id from public.payments where order_id='${order}');delete from public.clients where id='${client}';delete from public.app_admin_users where user_id='${actor}';delete from auth.users where id='${actor}';`)
}
