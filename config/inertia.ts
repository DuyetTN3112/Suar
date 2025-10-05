import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/inertia'

const inertiaConfig = defineConfig({
  rootView: (ctx) => {
    const url = ctx.request.url()
    if (url.startsWith('/admin')) return 'inertia_admin'
    if (url === '/org' || url.startsWith('/org/')) return 'inertia_org'
    return 'inertia_user'
  },

  /**
   * In dev mode, @adonisjs/inertia tries to read vite.manifest() to compute
   * an assets version hash. But @adonisjs/vite throws when manifest() is
   * called while the dev server is running (useDevServer=true), even if a
   * leftover manifest.json exists from a previous build.
   *
   * Setting assetsVersion bypasses the manifest() call entirely.
   * In production, it stays undefined so Inertia falls back to the manifest hash.
   */
  assetsVersion: !app.inProduction ? '1' : undefined,

  ssr: {
    enabled: false,
    entrypoint: 'inertia/apps/user/app.ts',
  },
})

export default inertiaConfig
