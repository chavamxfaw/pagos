import assert from 'node:assert/strict'
import test from 'node:test'
import {readFileSync} from 'node:fs'
import {legalIdentity} from '../lib/legal-config.ts'

test('legal publication requires an explicitly supplied address',()=>{
 assert.equal(legalIdentity({}).ready,false)
 assert.equal(legalIdentity({OTLA_LEGAL_ADDRESS:'  '}).ready,false)
 assert.equal(legalIdentity({OTLA_LEGAL_ADDRESS:'Domicilio de prueba'}).ready,true)
 assert.equal(legalIdentity({}).name,'Salvador Cervantes Tijerina')
 assert.equal(legalIdentity({}).email,'buenas@chavacervantes.dev')
})
test('public homepage does not depend on a database session',()=>{
 const source=readFileSync(new URL('../app/page.tsx',import.meta.url),'utf8')
 assert.doesNotMatch(source,/createClient|redirect\(/)
 assert.match(source,/PublicShell/)
})
test('public navigation exposes both legal documents',()=>{
 const shell=readFileSync(new URL('../components/public-shell.tsx',import.meta.url),'utf8')
 for(const path of ['/privacidad','/condiciones']) assert.ok(shell.includes(`href="${path}"`))
})
