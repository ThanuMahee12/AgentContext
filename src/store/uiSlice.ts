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
}

const initialState: UiState = {
  query: '',
  tag: null,
  navOpen: false,
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
  },
})

export const { setQuery, toggleTag, clearFilters, setNavOpen } = uiSlice.actions
export default uiSlice.reducer
