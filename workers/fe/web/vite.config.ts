import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Build into the FE Worker's static-assets directory so `wrangler deploy`
    // ships the freshly built bundle.
    outDir: '../assets',
    emptyOutDir: true,
    sourcemap: false,
  },
  server: {
    port: 5173,
  },
})
