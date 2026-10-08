import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const src = (p) => fileURLToPath(new URL(`./src/${p}`, import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // The screens are shared with the CICOD CRM (Next.js); these adapters map its Link/router onto React Router.
      { find: /^next\/link$/, replacement: src('shims/next-link.tsx') },
      { find: /^next\/navigation$/, replacement: src('shims/next-navigation.ts') },
      { find: /^@\//, replacement: src('') },
    ],
  },
})
