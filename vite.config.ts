import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the built app can be served from any sub-path (GitHub Pages, intranet, file server).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 900,
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
})
