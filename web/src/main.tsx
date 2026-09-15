import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// Restore the explicit theme choice before first paint so the page never
// flashes the system theme on the way to the chosen one.
const saved = localStorage.getItem('ac-theme')
if (saved === 'dark' || saved === 'light') {
  document.documentElement.setAttribute('data-theme', saved)
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
