/* Markdown in content/ is the source of truth. This bakes it into
 * src/content/content.json, which the app imports.
 *
 * The bundle is a FALLBACK, not the serving path: the site reads Firestore
 * first so content can be published without a deploy, and drops back to this
 * copy when Firestore is unreachable or has nothing newer. Shipping it means
 * the site is never blank, even offline.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'content')
const out = join(root, 'src/content/content.json')

/** Frontmatter values are JSON, so a colon or quote in a title cannot break
 *  the parse. Anything unparseable is kept as a raw string rather than dropped. */
function parse(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/)
  if (!m) return { meta: {}, body: raw.trim() }
  const meta = {}
  for (const line of m[1].split('\n')) {
    const at = line.indexOf(':')
    if (at < 0) continue
    const key = line.slice(0, at).trim()
    const rest = line.slice(at + 1).trim()
    try { meta[key] = JSON.parse(rest) } catch { meta[key] = rest.replace(/^["']|["']$/g, '') }
  }
  return { meta, body: raw.slice(m[0].length).trim() }
}

const headings = (body) =>
  [...body.matchAll(/^(#{2,3})\s+(.+)$/gm)].map((m) => ({ depth: m[1].length, text: m[2].trim() }))

function load(folder) {
  const dir = join(src, folder)
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const { meta, body } = parse(readFileSync(join(dir, f), 'utf8'))
      return {
        id: f.replace(/\.md$/, ''),
        title: meta.title || f.replace(/\.md$/, ''),
        date: meta.date || '',
        status: meta.status || '',
        url: meta.url || '',
        gist: meta.gist || '',
        notion: meta.notion || '',
        project: meta.project || '',
        tags: Array.isArray(meta.tags) ? meta.tags : [],
        body,
        headings: headings(body),
        source: `content/${folder}/${f}`,
        bytes: Buffer.byteLength(body, 'utf8'),
        comments: [],
      }
    })
}

const byDate = (a, b) => (b.date || '').localeCompare(a.date || '')
const byTitle = (a, b) => a.title.localeCompare(b.title)

const payload = {
  generated_at: new Date().toISOString(),
  brainstorms: load('brainstorm').sort(byDate),
  discussions: load('ideas').sort(byDate),
  kt: load('kt').sort(byTitle),
  notes: load('tech-commands').sort(byTitle),
}

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(payload, null, 2))

console.log('content built from markdown')
for (const k of ['brainstorms', 'discussions', 'kt', 'notes']) {
  console.log(`  ${k.padEnd(12)} ${payload[k].length}`)
}
