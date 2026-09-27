// Explicit opt-in: durable fixtures ONLY on the disposable local Supabase database.
import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
const enabled = process.env.RUN_LOCAL_STRIPE_SQL === '1'
const url = 'postgresql://postgres:postgres@127.0.0.1:54422/postgres'
function sql(query, onOutput) {
  return new Promise((resolve,reject)=>{
    const child=spawn('psql',[url,'-XAt','-v','ON_ERROR_STOP=1','-f','-'])
    child.stdin.end(query)
    let output='',error=''
    child.stdout.on('data',chunk=>{output+=chunk;onOutput?.(output)})
    child.stderr.on('data',chunk=>{error+=chunk})
    child.on('error',reject)
    child.on('close',code=>code===0?resolve(output.trim()):reject(Error(error)))
  })
}
test('real database overlap: one reservation; cancellation waits then refuses active checkout',{skip:!enabled},async()=>{
  const client=randomUUID(),order=randomUUID(),request=randomUUID()
  const reserve=`select public.reserve_stripe_checkout('${order}','${request}',100,0,100,'{}')->>'id';`
  try {
    await sql(`insert into public.clients(id,name) values('${client}','Stripe race fixture');
      insert into public.orders(id,client_id,concept,total_amount,subtotal_amount) values('${order}','${client}','Race fixture',1000,1000);
      insert into public.stripe_payment_requests(id,order_id,client_id,amount,total_charged,concept) values('${request}','${order}','${client}',100,100,'Race fixture');`)
    let notify
    const locked=new Promise(resolve=>{notify=resolve})
    const first=sql(`begin; set local role service_role; ${reserve} select 'RESERVED'; select pg_sleep(0.6); commit;`,out=>{if(out.includes('RESERVED'))notify()})
    await locked
    const second=sql(`set role service_role; ${reserve}`)
    const cancel=assert.rejects(sql(`update public.orders set status='cancelled' where id='${order}'`),/Expire or reconcile/)
    const [a,b]=await Promise.all([first,second,cancel])
    const id=a.match(/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}/)?.[0]
    assert.ok(id)
    assert.ok(b.includes(id))
    assert.equal(await sql(`select count(*) from public.stripe_checkout_sessions where order_id='${order}'`),'1')
    assert.equal(await sql(`select status from public.orders where id='${order}'`),'pending')
  } finally {
    await sql(`delete from public.orders where id='${order}' and client_id='${client}'; delete from public.clients where id='${client}' and name='Stripe race fixture';`)
  }
})
