import { cookies } from 'next/headers'
import { timingSafeEqual } from 'node:crypto'
import { requireAdmin } from '@/lib/auth/admin'
import { createAdminClient } from '@/lib/supabase/admin'
import { callbackUrl,encryptToken,tokenExchange } from '@/lib/calendar/google'

export async function GET(request:Request){
 const back=new URL('/admin/calendar',process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3002')
 try{
  const user=await requireAdmin(),url=new URL(request.url),jar=await cookies()
  const expected=jar.get('calendar_oauth_state')?.value,verifier=jar.get('calendar_oauth_verifier')?.value,state=url.searchParams.get('state'),code=url.searchParams.get('code')
  for(const name of ['calendar_oauth_state','calendar_oauth_verifier'])jar.set(name,'',{path:'/api/calendar/google',maxAge:0,httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax'})
  if(!state||!expected||!verifier||!code||state.length!==expected.length||!timingSafeEqual(Buffer.from(state),Buffer.from(expected)))throw new Error('state')
  const token=await tokenExchange({grant_type:'authorization_code',code,redirect_uri:callbackUrl(),code_verifier:verifier})
  if(!token.refresh_token)throw new Error('refresh')
  const calendars: {id:string;summary:string;accessRole:string;primary?:boolean}[]=[]
  let pageToken=''
  do{
   const list=await fetch(`https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250${pageToken?`&pageToken=${encodeURIComponent(pageToken)}`:''}`,{headers:{Authorization:`Bearer ${token.access_token}`},cache:'no-store',signal:AbortSignal.timeout(15000)})
   if(!list.ok)throw new Error('calendars')
   const result=await list.json();calendars.push(...(result.items??[]));pageToken=result.nextPageToken??''
  }while(pageToken)
  const account=calendars.find(c=>c.primary)?.id
  if(!account)throw new Error('primary')
  const db=createAdminClient()
  const {data:connection,error}=await db.from('calendar_connections').upsert({owner_user_id:user.id,account_email:account,refresh_token_encrypted:encryptToken(token.refresh_token)},{onConflict:'owner_user_id,account_email'}).select('id').single()
  if(error||!connection)throw new Error('save')
  for(const calendar of calendars){
   const {data:existing}=await db.from('connected_calendars').select('id').eq('connection_id',connection.id).eq('google_calendar_id',calendar.id).maybeSingle()
   const values={owner_user_id:user.id,connection_id:connection.id,google_calendar_id:calendar.id,name:calendar.summary||calendar.id,access_role:calendar.accessRole}
   const result=existing?await db.from('connected_calendars').update(values).eq('id',existing.id):await db.from('connected_calendars').insert(values)
   if(result.error)throw new Error('save_calendar')
  }
  back.searchParams.set('connected','1')
 }catch{back.searchParams.set('error','connection')}
 return Response.redirect(back)
}
