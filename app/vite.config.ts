import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  // Serve the images folder as static assets at the URL root
  publicDir: path.resolve(__dirname, '../images'),
  server: {
    fs: {
      // Allow reading files from the repo root (for import.meta.glob on ../images)
      allow: [path.resolve(__dirname, '..')]
    }
  }
})
