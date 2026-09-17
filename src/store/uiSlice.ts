import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

/** Cross-cutting UI state for the public site.
 *
 *  Search and tag filtering live here rather than in a page because they apply
 *  across sections: a tag picked while reading Discussions should still be
 *  active when you switch to Brainstorms, so the filter belongs above both.
 *  Theme lives here too so every surface reads one source instead of each
 *  component poking at the document element.
 */
interface UiState {
  query: string
  tag: string | null
  navOpen: boolean
  /** Folder paths currently open in the command tree.
   *
   *  Lives here rather than in the tree component so it survives navigating
   *  into a command and back - collapsing everything you had opened is the
   *  fastest way to make a tree annoying. */
  expanded: string[]
}

const initialState: UiState = {
  query: '',
  tag: null,
  navOpen: false,
  expanded: [],
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setQuery(state, action: PayloadAction<string>) {
      state.query = action.payload
    },
    toggleTag(state, action: PayloadAction<string>) {
      state.tag = state.tag === action.payload ? null : action.payload
    },
    clearFilters(state) {
      state.query = ''
      state.tag = null
    },
    setNavOpen(state, action: PayloadAction<boolean>) {
      state.navOpen = action.payload
    },
    toggleFolder(state, action: PayloadAction<string>) {
      const at = state.expanded.indexOf(action.payload)
      if (at >= 0) state.expanded.splice(at, 1)
      else state.expanded.push(action.payload)
    },
    setExpanded(state, action: PayloadAction<string[]>) {
      state.expanded = action.payload
    },
  },
})

export const { setQuery, toggleTag, clearFilters, setNavOpen, toggleFolder, setExpanded } =
  uiSlice.actions
export default uiSlice.reducer
