import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'

import App from './App'
import { store } from './store'
import './styles.css'

// Restore the explicit theme choice before first paint so the page never
// flashes the system theme on the way to the chosen one.
const saved = localStorage.getItem('ac-theme')
if (saved === 'dark' || saved === 'light') {
  document.documentElement.setAttribute('data-theme', saved)
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
)
