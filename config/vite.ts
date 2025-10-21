import { defineConfig } from '@adonisjs/vite'

const manifestFile =
  process.env['NODE_ENV'] === 'test'
    ? 'build/public/assets/.vite/manifest.json'
    : 'public/assets/.vite/manifest.json'

const viteBackendConfig = defineConfig({
  buildDirectory: 'public/assets',

  manifestFile,

  assetsUrl: '/assets',

  scriptAttributes: {
    defer: true,
  },
})

export default viteBackendConfig
