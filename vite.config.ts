import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    watch: {
      ignored: ['**/photos/**', '**/public/photos/**', '**/*.jpg', '**/*.jpeg', '**/*.png']
    }
  }
})
