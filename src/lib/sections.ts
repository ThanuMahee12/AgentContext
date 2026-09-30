/** Document shapes and the section map.
 *
 * Content is not bundled: the app reads documents from Firestore at runtime.
 * What stays here is the part that is configuration rather than data - which
 * sections exist, what they are called, which collection each one reads - and
 * the record shape those documents arrive in.
 *
 * The kinds mirror `agentprobe/content/kinds.py` in AgentProbe, which is what
 * publishes them. A kind added there needs an entry here and in
 * firestore.rules before the site can show it.
 */

export interface Heading {
  depth: number
  text: string
}

/** An external link, extracted by the publisher with the sentence it sat in. */
export interface Link {
  url: string
  /** clickup, slack, google-sheets, google-docs, google-drive, github, gitlab, jira, … or web */
  source: string
  type: string
  external_id: string
  label: string
  sentence: string
  origin: string
}

export interface Diagram {
  index: number
  type: string
  source: string
}

export interface Doc {
  id: string
  kind: KindId
  /** Path within the section, with the UTC date folders already stripped -
   *  see `undate` in useContent. */
  path: string
  segments: string[]
  /** The folder this document sits in; '' at the section root. */
  parent: string
  depth: number
  title: string
  description?: string
  date: string
  status?: string
  body: string
  headings: Heading[]
  tags: string[]
  project?: string
  topics?: string[]
  /** Firestore paths this document points at, e.g. `topics/splc-onboarding`. */
  refs: string[]
  /** Firestore paths of documents that point at this one. */
  backlinks: string[]
  links: Link[]
  diagrams: Diagram[]
  source: string
  bytes: number
  url?: string
  gist?: string
  notion?: string
}

export type KindId =
  | 'plans'
  | 'discussions'
  | 'decisions'
  | 'ideas'
  | 'brainstorms'
  | 'workflows'
  | 'catchups'
  | 'topics'
  | 'projects'

export type SectionId = 'home' | KindId

export interface Section {
  id: SectionId
  label: string
  path: string
  /** One line saying what the section is for, used on the home index. */
  blurb: string
}

export interface Kind extends Section {
  id: KindId
  /** The Firestore collection. Equal to the id except for projects, because
   *  `projects` is the session archive. */
  collection: string
}

export const kinds: Kind[] = [
  {
    id: 'plans',
    collection: 'plans',
    label: 'Plans',
    path: '/plans',
    blurb: 'What we intend to do, and in what order.',
  },
  {
    id: 'discussions',
    collection: 'discussions',
    label: 'Discussions',
    path: '/discussions',
    blurb: 'Conversations worth keeping.',
  },
  {
    id: 'decisions',
    collection: 'decisions',
    label: 'Decisions',
    path: '/decisions',
    blurb: 'What was chosen, why, and what was rejected.',
  },
  {
    id: 'ideas',
    collection: 'ideas',
    label: 'Ideas',
    path: '/ideas',
    blurb: 'Things that might be worth doing, and open questions.',
  },
  {
    id: 'brainstorms',
    collection: 'brainstorms',
    label: 'Brainstorms',
    path: '/brainstorms',
    blurb: 'Half-formed ideas, with the thinking left in.',
  },
  {
    id: 'workflows',
    collection: 'workflows',
    label: 'Workflows',
    path: '/workflows',
    blurb: 'How a thing is done, step by step.',
  },
  {
    id: 'catchups',
    collection: 'catchups',
    label: 'Catchup notes',
    path: '/catchups',
    blurb: 'One a day: what happened, and what is next.',
  },
  {
    id: 'topics',
    collection: 'topics',
    label: 'Topics',
    path: '/topics',
    blurb: 'A subject described once, with everything that points at it.',
  },
  {
    id: 'projects',
    collection: 'project_docs',
    label: 'Projects',
    path: '/projects',
    blurb: 'What each project is and where it lives.',
  },
]

export const sections: Section[] = [
  { id: 'home', label: 'Home', path: '/', blurb: 'Everything collected in one place.' },
  ...kinds,
]

const BY_COLLECTION = new Map(kinds.map((k) => [k.collection, k]))

/** A Firestore path from `refs` or `backlinks` - `topics/splc` - as the kind
 *  it lives in and the document id, or undefined for a collection this app
 *  does not show. */
export function resolveRef(ref: string): { kind: Kind; id: string } | undefined {
  const [collection, id] = ref.split('/')
  const kind = BY_COLLECTION.get(collection)
  return kind && id ? { kind, id } : undefined
}
