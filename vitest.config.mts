import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { fileURLToPath } from 'node:url'

const appRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
    plugins: [react(), tsconfigPaths({ projects: ['./tsconfig.json'], loose: true })],
    resolve: {
        alias: {
            '@': appRoot,
        },
        // Prefer TypeScript sources over same-named compiled .js siblings.
        //
        // Vite's default order puts '.js' BEFORE '.ts', and this repo still
        // carries stale compiled artifacts next to their sources (e.g.
        // utils/server-utils.js from July next to a newer server-utils.ts).
        // Importing "@/utils/server-utils" therefore loaded the stale CJS file,
        // whose bare require("@repo/db/schema") bypasses the tsconfig path
        // mapping that vite-tsconfig-paths applies — so the whole test file
        // died with "Cannot find module '@repo/db/schema'" before running a
        // single test. Next.js is unaffected: its webpack config resolves .ts
        // first, which is why only vitest saw this.
        extensions: ['.mts', '.ts', '.tsx', '.mjs', '.js', '.jsx', '.json'],
    },
    test: {
        environment: 'happy-dom',
        setupFiles: ['./vitest.setup.mts'],
        globals: true,
        include: ['tests/**/*.test.{ts,tsx}'],
    },
})
