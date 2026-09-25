import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Default: relative base, so the built app can be served from any sub-path (intranet, file
// server). Deployments that need an absolute base set VITE_BASE, e.g. VITE_BASE=/human-anatomy/
// for GitHub Pages. All data/model URLs are resolved against import.meta.env.BASE_URL.
const base = process.env.VITE_BASE || './'

const nodeModule = (names: string) => new RegExp(`[\\\\/]node_modules[\\\\/](?:${names})[\\\\/]`)

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: true,
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      output: {
        // Vendor chunks change rarely and stay cached across app deploys. three.js is only
        // imported by the lazily loaded 3D viewer (src/app/lazy.tsx), so its chunk is not part
        // of the initial download.
        codeSplitting: {
          groups: [
            { name: 'three', test: nodeModule('three|three-mesh-bvh'), priority: 3 },
            { name: 'react', test: nodeModule('react|react-dom|scheduler'), priority: 2 },
            { name: 'vendor', test: nodeModule('zod|minisearch|idb|zustand|use-sync-external-store'), priority: 1 },
          ],
        },
      },
    },
  },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
})
