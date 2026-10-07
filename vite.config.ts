import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the build works under the GitHub Pages sub-path (/MarketSizer/).
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
