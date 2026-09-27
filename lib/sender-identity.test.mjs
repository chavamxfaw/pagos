import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

async function loadSettings(displayName) {
  const source = readFileSync(new URL('./user-settings.ts', import.meta.url), 'utf8')
    .replace("import 'server-only'", '')
    .replace("import { createAdminClient } from '@/lib/supabase/admin'", `
      const createAdminClient = () => ({from: () => ({select: () => ({eq: (_key, id) => ({
        single: async () => ({data: {display_name: ${JSON.stringify(displayName)}}})
      })})})})
    `)
  const compiled = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext}}).outputText
  return import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
}

test('OTLA branding remains distinct from the authenticated sender', async () => {
  const saved = process.env.PLATFORM_OWNER_USER_ID
  process.env.PLATFORM_OWNER_USER_ID = 'owner-test'
  try {
    const configured = await loadSettings('  Chava Cervantes  ')
    assert.equal(await configured.getDisplayName('owner-test', 'owner@example.invalid'), 'Chava Cervantes')
    assert.equal(await configured.getDefaultSenderName(), 'Chava Cervantes')
    const empty = await loadSettings(null)
    assert.equal(await empty.getDisplayName('owner-test', 'owner@example.invalid'), 'Chava Cervantes')
    assert.equal(await empty.getDisplayName('different-admin', 'other@example.invalid'), 'other@example.invalid')
    assert.equal(await empty.getDefaultSenderName(), 'Chava Cervantes')
  } finally {
    if (saved === undefined) delete process.env.PLATFORM_OWNER_USER_ID
    else process.env.PLATFORM_OWNER_USER_ID = saved
  }
})
