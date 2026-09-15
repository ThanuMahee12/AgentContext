import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    // A manualChunks split for the Firestore SDK belongs here once the data
    // layer actually imports it. Declaring it early only produces an empty chunk.
  },
})
