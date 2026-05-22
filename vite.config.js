import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:3001'
  const allowedHosts = env.VITE_PREVIEW_HOSTS
    ? env.VITE_PREVIEW_HOSTS.split(',').map((h) => h.trim())
    : []

  return {
    plugins: [react()],
    server: {
      port: 4175,
      hmr: env.VITE_HMR_HOST
        ? { host: env.VITE_HMR_HOST }
        : undefined,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    preview: {
      allowedHosts,
    },
  }
})
