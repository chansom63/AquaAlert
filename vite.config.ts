import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api-aws': {
        target: 'https://znjdsbpuhd.execute-api.ap-south-1.amazonaws.com/default',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-aws/, ''),
      },
    },
  },
})
