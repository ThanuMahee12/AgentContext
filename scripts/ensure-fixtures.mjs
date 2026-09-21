/* fixtures.json holds real session data and is git-ignored, so a fresh clone
 * has nothing for the app's static import to resolve. Seed it from the empty
 * template rather than letting the build fail on a missing module.
 *
 * Populate it for real with ../scripts/export-fixtures.sh
 */
import { copyFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const target = resolve(here, '../src/lib/fixtures.json')
const template = resolve(here, '../src/lib/fixtures.example.json')

if (!existsSync(target)) {
  copyFileSync(template, target)
  console.log('seeded empty fixtures.json — run scripts/export-fixtures.sh for real data')
}
