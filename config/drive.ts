import { defineConfig } from '@adonisjs/drive'

const driveConfig = defineConfig({
  disks: {
    local: {
      driver: 'local',
      root: '../storage/app',
      visibility: 'private',
      serveFiles: true,
      basePath: '/uploads',
    },

    public: {
      driver: 'local',
      root: '../storage/app/public',
      visibility: 'public',
      serveFiles: true,
      basePath: '/uploads',
    },
  },

  // Default disk to use when no disk is explicitly
  // mentioned
  default: 'local',
})

export default driveConfig
