import test from 'node:test'
import assert from 'node:assert/strict'
import {readLimitedText} from './request-body.ts'

test('body reader enforces bytes even without content-length',async()=>{
 const request=new Request('https://example.invalid',{method:'POST',body:'ééé'})
 await assert.rejects(readLimitedText(request,5),/demasiado grande/)
})
test('body reader preserves UTF8 and rejects oversized declared payloads',async()=>{
 assert.equal(await readLimitedText(new Request('https://example.invalid',{method:'POST',body:'hola á'}),20),'hola á')
 await assert.rejects(readLimitedText(new Request('https://example.invalid',{method:'POST',headers:{'content-length':'100'},body:'x'}),20),/demasiado grande/)
})
