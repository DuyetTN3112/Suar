import { defineConfig, services } from '@adonisjs/drive'

const driveConfig = defineConfig({
  services: {
    local: services.fs({
      location: '../storage/app',
      visibility: 'private',
      serveFiles: true,
      routeBasePath: '/uploads',
    }),

    public: services.fs({
      location: '../storage/app/public',
      visibility: 'public',
      serveFiles: true,
      routeBasePath: '/uploads',
    }),
  },

  // Default disk to use when no disk is explicitly
  // mentioned
  default: 'local',
})

export default driveConfig
