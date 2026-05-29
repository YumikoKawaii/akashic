import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Connect RPC procedures are mounted at the proto package root
      // (/akashic.v1.<Service>/<Method>); forward them to the Go server.
      '/akashic.v1.': 'http://localhost:8080',
    },
  },
})
