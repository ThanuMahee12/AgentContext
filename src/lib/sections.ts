/** Document shapes and the section map.
 *
 * Content itself is no longer bundled: the app reads documents from Firestore
 * at runtime. What stays here is the part that is configuration rather than
 * data - which sections exist, what they are called and where they live - and
 * the record shapes those documents arrive in.
 */

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
  /** Folder path within the section, e.g. "data-alchemy/bbocax/mapping".
   *  Stored as a string, not modelled as nested collections - see the note in
   *  scripts/build-content.mjs for why. */
  path: string
  segments: string[]
  /** The folder this document sits in; '' at the section root. */
  parent: string
  depth: number
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

export type SectionId = 'home' | 'brainstorms' | 'kt' | 'discussions' | 'notes'

export interface Section {
  id: SectionId
  label: string
  path: string
  /** One line saying what the section is for, used on the home index. */
  blurb: string
}

/** Which slice of content a section lists. `home` lists none. */
export const SECTION_KEY: Record<
  Exclude<SectionId, 'home'>,
  'brainstorms' | 'discussions' | 'kt' | 'notes'
> = {
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
    label: 'Discussion',
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
