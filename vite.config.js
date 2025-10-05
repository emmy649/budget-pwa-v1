import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // важно за репо emmy649/budget-pwa-v1 на GitHub Pages
  base: '/budget-pwa-v1/',
})
