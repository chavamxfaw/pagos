import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

// Each denial uses a fresh backend: no role switching after caching a privileged
// PL/pgSQL call. This preserves real negative checks, avoiding the local engine crash.
const container='pagos-calendar-audit-isolated'
const calls=[
 'select * from public.calendar_connections',
 "select public.reserve_calendar_booking(null,now(),'','','','','73000000-0000-0000-0000-000000000005','')",
 'select public.approve_calendar_booking_contact(null,null,null)',
 "select public.claim_calendar_booking_work(null,null,'sync',false)",
 'select public.finish_calendar_booking_work(null,null,true,null)',
 'select public.reap_calendar_booking_leases()',
]
for(const role of ['anon','authenticated'])for(const statement of calls){
 test(`${role}: ${statement.split('(')[0]} denied in fresh backend`,()=>{
  const result=spawnSync('docker',['exec',container,'psql','-h','/tmp','-U','postgres','-d','postgres','-X','-v','ON_ERROR_STOP=1','-v','VERBOSITY=verbose','-c',`begin;set local role ${role};${statement};rollback;`],{encoding:'utf8',timeout:10000})
  assert.equal(result.status,1,result.stderr)
  assert.match(result.stderr,/42501: permission denied/)
  assert.doesNotMatch(result.stderr,/server closed|terminated|connection.*lost/i)
 })
}
