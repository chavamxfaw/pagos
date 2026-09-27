import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import config from '../next.config.ts'

test('all routes receive an unconditional noindex, nofollow header', async () => {
  const rules = await config.headers()
  const global = rules.find(rule => rule.source === '/:path*')
  assert.ok(global)
  assert.equal(global.has, undefined)
  assert.equal(global.missing, undefined)
  assert.deepEqual(global.headers.find(header => header.key === 'X-Robots-Tag'), {
    key: 'X-Robots-Tag', value: 'noindex, nofollow',
  })
  for (const rule of rules) {
    for (const header of rule.headers) {
      if (header.key.toLowerCase() === 'x-robots-tag') {
        assert.equal(header.value, 'noindex, nofollow')
      }
    }
  }
})

test('robots permits crawlers to see noindex without advertising a sitemap', () => {
  const robots = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8')
  assert.match(robots, /^User-agent: \*$/m)
  assert.match(robots, /^Allow: \/$/m)
  assert.doesNotMatch(robots, /^(Disallow|Sitemap):/mi)
})

test('root HTML metadata preserves noindex and nofollow', () => {
  const layout = readFileSync(new URL('../app/layout.tsx', import.meta.url), 'utf8')
  assert.match(layout, /robots:\s*\{\s*index: false,\s*follow: false,/)
  assert.match(layout, /googleBot: \{ index: false, follow: false \}/)
})
