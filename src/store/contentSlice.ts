import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { collection, getDocs, query, where } from 'firebase/firestore'

import { content as bundled, type Brainstorm, type Discussion, type Doc } from '../content'
import { db } from '../firebase'

/** Content state.
 *
 *  The bundle is the initial state, so the site renders immediately and works
 *  with no network at all. Firestore then hydrates over the top, which is what
 *  lets content be published without a deploy.
 *
 *  Order matters: bundle first, Firestore second. The reverse would mean a
 *  blank page while a request is in flight, and a permanently blank one if
 *  Firestore is unreachable - for content that is already sitting in the
 *  JavaScript the browser has downloaded.
 */
export type Origin = 'bundle' | 'firestore'

interface ContentState {
  brainstorms: Brainstorm[]
  discussions: Discussion[]
  kt: Doc[]
  notes: Doc[]
  origin: Origin
  hydrating: boolean
}

const initialState: ContentState = {
  brainstorms: bundled.brainstorms,
  discussions: bundled.discussions,
  kt: bundled.kt,
  notes: bundled.notes,
  origin: 'bundle',
  hydrating: false,
}

/** Section key as published by `agentprobe publish-docs`. */
type Section = 'brainstorms' | 'discussions' | 'kt' | 'notes'

export const hydrateContent = createAsyncThunk('content/hydrate', async () => {
  // Must match the security rule on /docs: only published documents are
  // publicly readable, and an unconstrained query is rejected rather than
  // filtered, so the filter is required here and not merely an optimisation.
  const snap = await getDocs(query(collection(db, 'docs'), where('visibility', '==', 'published')))
  const out: Record<Section, any[]> = { brainstorms: [], discussions: [], kt: [], notes: [] }

  for (const d of snap.docs) {
    const data = d.data() as any
    const section = data.section as Section
    if (out[section]) out[section].push({ ...data, comments: data.comments ?? [] })
  }

  const byDate = (a: any, b: any) => (b.date || '').localeCompare(a.date || '')
  const byTitle = (a: any, b: any) => (a.title || '').localeCompare(b.title || '')
  out.brainstorms.sort(byDate)
  out.discussions.sort(byDate)
  out.kt.sort(byTitle)
  out.notes.sort(byTitle)
  return out
})

const contentSlice = createSlice({
  name: 'content',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(hydrateContent.pending, (state) => {
        state.hydrating = true
      })
      .addCase(hydrateContent.fulfilled, (state, action) => {
        state.hydrating = false
        // An empty collection is not an update. Replacing real content with
        // nothing because a publish has not run yet would blank the site.
        const total = Object.values(action.payload).reduce((n, list) => n + list.length, 0)
        if (total === 0) return
        state.brainstorms = action.payload.brainstorms
        state.discussions = action.payload.discussions
        state.kt = action.payload.kt
        state.notes = action.payload.notes
        state.origin = 'firestore'
      })
      .addCase(hydrateContent.rejected, (state) => {
        // Keep the bundled copy. The site stays readable offline, and during a
        // Firestore outage, rather than showing an error for content it has.
        state.hydrating = false
      })
  },
})

export default contentSlice.reducer
