import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/api/chatwork': {
        target: 'https://api.chatwork.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/chatwork/, ''),
      },
    },
  },
})
