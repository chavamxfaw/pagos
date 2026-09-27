import test from 'node:test'
import assert from 'node:assert/strict'
import { withSenderTemplate } from './template-identity.ts'

test('legacy template retains exact approved variables and warns of absent sender', () => {
 const variables = {'1':'Contacto','2':'Recurso','3':'https://example.invalid'}
 const result = withSenderTemplate('legacy',undefined,variables,'Chava Cervantes','4')
 assert.deepEqual(result.template,{contentSid:'legacy',variables})
 assert.match(result.identityWarning,/no incluye/)
 assert.equal(result.template.variables['4'],undefined)
})
test('sender-aware template has explicit precedence without mutating legacy payload', () => {
 const variables = {'1':'Contacto','7':'token'}
 const result = withSenderTemplate('legacy','approved-v2',variables,'Chava Cervantes','8')
 assert.equal(result.template.contentSid,'approved-v2')
 assert.equal(result.template.variables['8'],'Chava Cervantes')
 assert.equal(variables['8'],undefined)
 assert.equal(result.identityWarning,null)
})
test('missing template stays unavailable, never invents an approval', () => {
 assert.equal(withSenderTemplate(undefined,undefined,{},'Chava','4').template,null)
})
