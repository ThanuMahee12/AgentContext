import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

/** Cross-cutting UI state for the public site.
 *
 *  Search and tag filtering live here rather than in a page because they apply
 *  across sections: a tag picked while reading Discussions should still be
 *  active when you switch to Brainstorms, so the filter belongs above both.
 *  Theme lives here too so every surface reads one source instead of each
 *  component poking at the document element.
 */
export type Theme = 'system' | 'light' | 'dark'

interface UiState {
  query: string
  tag: string | null
  theme: Theme
  navOpen: boolean
}

const storedTheme = ((): Theme => {
  try {
    const t = localStorage.getItem('ac-theme')
    return t === 'light' || t === 'dark' ? t : 'system'
  } catch {
    // Private windows and blocked site data throw on access rather than
    // returning null, so the read is guarded and the default stands.
    return 'system'
  }
})()

const initialState: UiState = {
  query: '',
  tag: null,
  theme: storedTheme,
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
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload
      const root = document.documentElement
      if (action.payload === 'system') root.removeAttribute('data-theme')
      else root.setAttribute('data-theme', action.payload)
      try {
        if (action.payload === 'system') localStorage.removeItem('ac-theme')
        else localStorage.setItem('ac-theme', action.payload)
      } catch {
        /* the toggle still works for this session */
      }
    },
    setNavOpen(state, action: PayloadAction<boolean>) {
      state.navOpen = action.payload
    },
  },
})

export const { setQuery, toggleTag, clearFilters, setTheme, setNavOpen } = uiSlice.actions
export default uiSlice.reducer
