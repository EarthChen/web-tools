import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/web-tools/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-lib': ['pdfjs-dist', 'jspdf', 'jszip'],
          'excel-lib': ['xlsx'],
          'json-lib': ['json5', 'jsonpath-plus', 'jsonrepair'],
        },
      },
    },
  },
})
