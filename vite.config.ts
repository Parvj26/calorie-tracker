import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'recharts': ['recharts'],
          'supabase': ['@supabase/supabase-js'],
          'date-fns': ['date-fns'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
    sourcemap: false,
  },
})
