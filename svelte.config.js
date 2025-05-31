import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/vite-plugin-svelte').SvelteConfig} */
export default {
  // Svelte 5 preprocessor for TypeScript, SCSS, etc.
  preprocess: vitePreprocess(),

  // Svelte 5 has runes enabled by default
  // No need for legacy compilerOptions

  // onwarn để suppress các warning không cần thiết trong quá trình migration
  onwarn: (warning, handler) => {
    // Suppress a11y warnings during development
    if (warning.code.startsWith('a11y-')) return

    // Suppress unused export warnings khi page chưa migrate
    if (warning.code === 'unused-export-let') return

    // Handle all other warnings normally
    handler(warning)
  },
}
