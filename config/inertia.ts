import { defineConfig } from '@adonisjs/inertia'

const inertiaConfig = defineConfig({
  rootView: 'inertia_layout',

  ssr: {
    enabled: false,
    entrypoint: 'inertia/app.ts',
  },
})

export default inertiaConfig
