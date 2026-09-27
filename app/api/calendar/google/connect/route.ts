import { cookies } from 'next/headers'
import { randomBytes,createHash } from 'node:crypto'
import { requireAdmin } from '@/lib/auth/admin'
import { calendarConfigured,callbackUrl } from '@/lib/calendar/google'

export async function GET(){
 try{await requireAdmin()}catch{return Response.json({error:'No autorizado'},{status:401})}
 if(!calendarConfigured())return Response.redirect(new URL('/admin/calendar?error=configuration',process.env.NEXT_PUBLIC_APP_URL||'http://localhost:3002'))
 const state=randomBytes(32).toString('hex'),verifier=randomBytes(32).toString('base64url')
 const jar=await cookies(),options={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/api/calendar/google',maxAge:600}
 jar.set('calendar_oauth_state',state,options);jar.set('calendar_oauth_verifier',verifier,options)
 const url=new URL('https://accounts.google.com/o/oauth2/v2/auth')
 url.search=new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID!,redirect_uri:callbackUrl(),response_type:'code',scope:'https://www.googleapis.com/auth/calendar.calendarlist.readonly https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy',access_type:'offline',prompt:'consent',state,code_challenge:createHash('sha256').update(verifier).digest('base64url'),code_challenge_method:'S256'}).toString()
 return Response.redirect(url)
}
