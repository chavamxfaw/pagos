import test from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { verifyTwilioSignature, normalizeWhatsAppPhone, readVerifiedTwilioForm } from './security.ts'

test('Twilio published signature vector validates; modified URL/body/token fail', () => {
  const url='https://example.com/myapp.php?foo=1&bar=2'
  const fields=new URLSearchParams({CallSid:'CA1234567890ABCDE',Caller:'+14158675310',Digits:'1234',From:'+14158675310',To:'+18005551212'})
  const sig='L/OH5YylLD5NRKLltdqwSvS0BnU='
  assert.equal(verifyTwilioSignature(url,fields,sig,'12345'),true)
  assert.equal(verifyTwilioSignature(url+'/changed',fields,sig,'12345'),false)
  assert.equal(verifyTwilioSignature(url,fields,sig,'wrong'),false)
  fields.set('Digits','9999')
  assert.equal(verifyTwilioSignature(url,fields,sig,'12345'),false)
})
test('ambiguous duplicate params and missing signatures fail closed',()=>{
  assert.equal(verifyTwilioSignature('https://a.test',new URLSearchParams('Body=a&Body=b'),'anything','token'),false)
  assert.equal(verifyTwilioSignature('https://a.test',new URLSearchParams(),'','token'),false)
})
test('phone normalization supports Mexican legacy and international E164',()=>{
  assert.equal(normalizeWhatsAppPhone('whatsapp:+5218112345678'),'528112345678')
  assert.equal(normalizeWhatsAppPhone('81 1234 5678'),'528112345678')
  assert.equal(normalizeWhatsAppPhone('+14155552671'),'14155552671')
  assert.throws(()=>normalizeWhatsAppPhone('bad'))
})
test('webhook binds canonical origin, account, and signed callback query',async()=>{
  process.env.TWILIO_WEBHOOK_BASE_URL='https://crm.example.test'
  process.env.TWILIO_AUTH_TOKEN='fixture-token'
  process.env.TWILIO_ACCOUNT_SID='ACfixture'
  const params=new URLSearchParams({AccountSid:'ACfixture',MessageStatus:'sent'})
  const url='https://crm.example.test/api/whatsapp/status?message_id=example'
  const sig=createHmac('sha1','fixture-token').update(url+'AccountSidACfixtureMessageStatussent').digest('base64')
  const request=()=>new Request('http://untrusted-host/api/whatsapp/status?message_id=example',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','x-twilio-signature':sig},body:params})
  assert.ok(await readVerifiedTwilioForm(request(),'/api/whatsapp/status'))
  process.env.TWILIO_ACCOUNT_SID='different-account'
  assert.equal(await readVerifiedTwilioForm(request(),'/api/whatsapp/status'),null)
})
