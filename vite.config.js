import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0', // Espone su tutte le interfacce di rete
    // https: true, // Decommentare per HTTPS locale (richiede certificati)
    proxy: {
      '/api': {
        target: 'https://rentabike-backend-1.onrender.com',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          vendor: [
            'axios'
          ]
        }
      }
    }
  }
})