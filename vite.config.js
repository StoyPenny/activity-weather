import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4175,
    proxy: {
      '/api': {
        // VITE_API_TARGET lets Docker dev containers reach the backend service by name.
        // Falls back to localhost for direct host-machine development.
        target: process.env.VITE_API_TARGET || 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  preview: {
    // Empty array locks `vite preview` to localhost only. This is intentional —
    // nginx replaces `vite preview` in the Docker production flow.
    allowedHosts: []
  }
})
