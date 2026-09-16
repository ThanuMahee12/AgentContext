/* Fail the build if a production bundle contains local fixture data.
 *
 * The DEV guard in src/data/source.ts already makes this structurally
 * impossible, but Firebase Hosting is public and the cost of being wrong is a
 * data leak, so this checks the artifact rather than trusting the source.
 *
 * Method: take distinctive strings out of fixtures.json (if present) and assert
 * none of them survive into dist/. Falls back to a small deny-list when there
 * are no local fixtures, so CI still catches an accidental hardcode.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const dist = resolve(here, '../dist')
const fixtures = resolve(here, '../src/data/fixtures.json')

if (!existsSync(dist)) {
  console.error('verify-bundle: dist/ not found — run the build first')
  process.exit(1)
}

/** Distinctive, low-false-positive strings drawn from the real data. */
const needles = new Set()

if (existsSync(fixtures)) {
  const data = JSON.parse(readFileSync(fixtures, 'utf8'))
  for (const s of (data.sessions ?? []).slice(0, 25)) {
    if (s.session_id) needles.add(s.session_id)
    if (s.cwd && s.cwd.length > 6) needles.add(s.cwd)
    if (s.transcript_sha256) needles.add(s.transcript_sha256)
    for (const c of (s.commands ?? []).slice(0, 10)) {
      if (c.command && c.command.length > 24) needles.add(c.command.slice(0, 40))
    }
  }
  for (const c of (data.context ?? []).slice(0, 25)) {
    if (c.url && c.url.length > 20) needles.add(c.url)
  }
}

// Always checked, fixtures or not.
//
// These must be secret MATERIAL, not field names. `refresh_token` was in this
// list and matched the Firebase SDK itself - every auth library contains that
// identifier, so the guard failed every deploy on a legitimate dependency. A
// needle that fires on correct code trains people to ignore the guard, which is
// worse than not having one.
for (const s of [
  'BEGIN OPENSSH PRIVATE KEY',
  'BEGIN RSA PRIVATE KEY',
  'BEGIN PRIVATE KEY',
  'BEGIN EC PRIVATE KEY',
  'service_account', // only ever appears in a service-account key file
]) {
  needles.add(s)
}

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  )

const files = walk(dist).filter((f) => /\.(js|css|html|map|json)$/.test(f))
const hits = []

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  for (const needle of needles) {
    if (needle && text.includes(needle)) {
      hits.push({ file, needle: needle.slice(0, 60) })
    }
  }
}

if (hits.length) {
  console.error('\nverify-bundle: FAIL — production artifact contains local data\n')
  for (const h of hits.slice(0, 20)) console.error(`  ${h.file}\n    ↳ ${h.needle}`)
  console.error(`\n${hits.length} match(es). Refusing to deploy.\n`)
  process.exit(1)
}

console.log(`verify-bundle: OK — ${files.length} artifact(s), ${needles.size} pattern(s), no matches`)
