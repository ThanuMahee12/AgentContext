/** Firestore-backed DataSource.
 *
 *  Sessions live at projects/{project}/days/{YYYYMMDD}/sessions/{id}, so the
 *  cross-cutting views use a collection-group query over `sessions`. That is
 *  exactly why AgentProbe writes date/project/user_email as plain fields as
 *  well as path segments: Firestore cannot filter a collection-group query on
 *  ancestor path components.
 *
 *  Commands and transcript chunks live in subcollections and are deliberately
 *  NOT fetched here - one session in the real data carries 141 commands and a
 *  2.2 MB transcript. The list view reads summary documents only; detail is
 *  loaded per session when a card is opened.
 */

import {
  collection,
  collectionGroup,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore'

import { db } from '../firebase'
import type { Command, ContextItem, Session } from '../types'
import type { DataSource } from './source'

/** How many sessions the timeline pulls up front. */
const SESSION_LIMIT = 300
const CONTEXT_LIMIT = 500

export class FirestoreSource implements DataSource {
  readonly name = 'firestore'

  async sessions(): Promise<Session[]> {
    const q = query(
      collectionGroup(db, 'sessions'),
      orderBy('started', 'desc'),
      limit(SESSION_LIMIT),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => {
      const data = d.data() as Partial<Session>
      // Subcollections are not part of the document; the list view only needs
      // the counts, which the summary doc already carries.
      return { ...data, commands: [], files: [] } as Session
    })
  }

  async context(): Promise<ContextItem[]> {
    const q = query(collection(db, 'context'), orderBy('last_seen', 'desc'), limit(CONTEXT_LIMIT))
    const snap = await getDocs(q)
    return snap.docs.map((d) => d.data() as ContextItem)
  }

  /** Commands for one session, loaded when its detail panel opens. */
  async commands(session: Session): Promise<Command[]> {
    const path = `projects/${session.project}/days/${session.date.replace(/-/g, '')}/sessions/${session.session_id}/commands`
    const snap = await getDocs(query(collection(db, path), limit(1000)))
    return snap.docs
      .map((d) => d.data() as Command)
      .sort((a, b) => (a.ts || '').localeCompare(b.ts || ''))
  }
}
