import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/MonthlyTransactionReportAnalysis/',
  define: {
    __API_URL__: JSON.stringify(process.env.VITE_API_URL ?? 'http://localhost:3001/api/v1')
  },
  resolve: {
    alias: {
      '@transaction-report/shared': path.resolve(__dirname, '../shared/dist/esm')
    }
  }
})
