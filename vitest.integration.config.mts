import { defineConfig } from 'vitest/config'

// Integration tests talk to the local Supabase Postgres (npm run db:start).
export default defineConfig({
  test: {
    include: ['tests/integration/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 60_000,
  },
})
