import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true
  },
  optimizeDeps: {
    include: ['react-virtualized-auto-sizer', 'react-window']
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
      include: [/node_modules/]
    }
  }
})