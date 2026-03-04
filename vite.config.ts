import { defineConfig } from 'vite'

// Use relative paths so the build is deployable to any static host
// (GitHub Pages, Netlify, Vercel, etc.) without path configuration.
// To deploy under a sub-path (e.g. GitHub Pages project site), update the
// base value below, e.g. '/work-day-boredom-buster/'.
export default defineConfig({ base: './' })
