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
    },
    test: {
        environment: 'happy-dom',
        setupFiles: ['./vitest.setup.mts'],
        globals: true,
        include: ['tests/**/*.test.{ts,tsx}'],
    },
})
