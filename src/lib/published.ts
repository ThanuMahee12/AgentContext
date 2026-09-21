/** Reading the public collection.
 *
 *  Separate module from `firestore.ts` on purpose. Everything here runs for
 *  anonymous visitors and touches only `public/`, which is the one collection
 *  the rules expose. Keeping it apart from the authenticated data layer makes
 *  it obvious at a glance that the public routes have no code path into
 *  sessions, context, memory or credentials.
 */

import { collection, doc, getDoc, getDocs, limit, orderBy, query } from 'firebase/firestore'

import { db } from '../firebase'
import type { PublishedPage } from '../types'

const LIST_LIMIT = 100

export async function listPublished(): Promise<PublishedPage[]> {
  const q = query(collection(db, 'public'), orderBy('published_at', 'desc'), limit(LIST_LIMIT))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ slug: d.id, ...(d.data() as Omit<PublishedPage, 'slug'>) }))
}

export async function getPublished(slug: string): Promise<PublishedPage | null> {
  const snap = await getDoc(doc(db, 'public', slug))
  if (!snap.exists()) return null
  return { slug: snap.id, ...(snap.data() as Omit<PublishedPage, 'slug'>) }
}
