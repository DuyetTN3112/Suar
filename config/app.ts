import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { Settings } from 'luxon'

// Cấu hình múi giờ mặc định cho Luxon (múi giờ Việt Nam UTC+7)
DateTime.local().setZone('Asia/Ho_Chi_Minh')
// Thiết lập múi giờ mặc định cho tất cả các đối tượng DateTime mới
Settings.defaultZone = 'Asia/Ho_Chi_Minh'

export const http = defineConfig({
  generateRequestId: true,
  allowMethodSpoofing: false,

  useAsyncLocalStorage: false,

  cookie: {
    domain: '',
    path: '/',
    maxAge: '2h',
    httpOnly: true,
    secure: app.inProduction,
    sameSite: 'lax',
  },
})
