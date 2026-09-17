/** Typed access to the flat content module.
 *
 *  Everything the public site shows is bundled at build time from this one
 *  JSON. There is no CMS, no runtime fetch and no markdown loader - the site
 *  ships with its content, so a page render cannot fail on a network call.
 *
 *  The private session archive in Firestore is deliberately not part of this:
 *  it holds internal hostnames and production detail, and nothing here is
 *  behind authentication.
 */

import raw from './content.json'

export interface Comment {
  date: string
  topic: string
  content: string
}

export interface Heading {
  depth: number
  text: string
}

export interface Discussion {
  id: string
  title: string
  description?: string
  date: string
  summary: string
  url: string
  tags: string[]
  comments: Comment[]
  body?: string
  headings?: Heading[]
}

export interface Brainstorm {
  id: string
  title: string
  description?: string
  date: string
  status: string
  summary: string
  gist: string
  notion: string
  tags: string[]
  comments: Comment[]
}

export interface Doc {
  id: string
  title: string
  /** One line under the heading. Optional; the list falls back to headings. */
  description?: string
  body: string
  headings: Heading[]
  source: string
  bytes: number
  project?: string
}

export interface Content {
  generated_at: string
  discussions: Discussion[]
  brainstorms: Brainstorm[]
  notes: Doc[]
  kt: Doc[]
}

export const content = raw as unknown as Content

export type SectionId = 'home' | 'brainstorms' | 'kt' | 'discussions' | 'notes'

export interface Section {
  id: SectionId
  label: string
  path: string
  /** One line saying what the section is for, used on the home index. */
  blurb: string
}

/** Which slice of content a section lists. `home` lists none. */
export const SECTION_KEY: Record<Exclude<SectionId, 'home'>, 'brainstorms' | 'discussions' | 'kt' | 'notes'> = {
  brainstorms: 'brainstorms',
  kt: 'kt',
  discussions: 'discussions',
  notes: 'notes',
}

export const sections: Section[] = [
  { id: 'home', label: 'Home', path: '/', blurb: 'Everything collected in one place.' },
  {
    id: 'brainstorms',
    label: 'Brainstorm',
    path: '/brainstorm',
    blurb: 'Half-formed ideas, with the thinking left in.',
  },
  {
    id: 'kt',
    label: 'KT',
    path: '/kt',
    blurb: 'Handover material: how a project is set up and run.',
  },
  {
    id: 'discussions',
    label: 'Ideas',
    path: '/ideas',
    blurb: 'Proposals worked through with other people.',
  },
  {
    id: 'notes',
    label: 'Tech Commands',
    path: '/tech-commands',
    blurb: 'Commands, patterns and reference worth not re-deriving.',
  },
]

export function findDoc(list: Doc[], id: string): Doc | undefined {
  return list.find((d) => d.id === id)
}

/** Every distinct tag across discussions and brainstorms, most used first. */
export function allTags(): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>()
  for (const item of [...content.discussions, ...content.brainstorms]) {
    for (const t of item.tags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}
