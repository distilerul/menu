import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Do not bundle local image assets; they are served from R2.
  publicDir: false,
})
