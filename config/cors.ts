import { defineConfig } from '@adonisjs/cors'
import env from '#start/env'

const corsConfig = defineConfig({
  enabled: true,

  /**
   * FIX BẢO MẬT: Thay `origin: []` (block tất cả) bằng callback.
   * Cho phép same-origin (APP_URL) và reject cross-origin không hợp lệ.
   * Inertia.js dùng same-origin nên đây là config phù hợp.
   */
  origin(requestOrigin: string) {
    const appUrl = env.get('APP_URL', '')
    // Cho phép same-origin requests
    if (requestOrigin === appUrl) {
      return true
    }
    // Development: cho phép localhost với mọi port (Vite dev server)
    if (env.get('NODE_ENV') === 'development' && requestOrigin.startsWith('http://localhost')) {
      return true
    }
    return false
  },

  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  exposeHeaders: ['X-Cache'],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
