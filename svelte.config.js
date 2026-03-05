import { vitePreprocess } from '@sveltejs/vite-plugin-svelte'

/** @type {import('@sveltejs/vite-plugin-svelte').SvelteConfig} */
export default {
  // Svelte 5 preprocessor for TypeScript, SCSS, etc.
  preprocess: vitePreprocess(),

  // Svelte 5 has runes enabled by default
  // No need for legacy compilerOptions
}
