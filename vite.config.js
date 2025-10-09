// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/budget-pwa-v1/', // ← точно името на репото в GitHub
})
