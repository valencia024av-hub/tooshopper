// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // puerto del frontend
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // backend
        changeOrigin: true,
      },
    },
  },
})
