import { defineConfig } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { DateTime, Settings } from 'luxon'

import env from '#start/env'

// Cấu hình múi giờ mặc định cho Luxon (múi giờ Việt Nam UTC+7)
DateTime.local().setZone('Asia/Ho_Chi_Minh')
// Thiết lập múi giờ mặc định cho tất cả các đối tượng DateTime mới
Settings.defaultZone = 'Asia/Ho_Chi_Minh'

function boundedHttpTimeout(name: string, value: number): number {
  if (!Number.isSafeInteger(value) || value < 1_000 || value > 300_000) {
    throw new RangeError(`${name} must be an integer between 1000 and 300000`)
  }
  return value
}

export const http = defineConfig({
  generateRequestId: true,
  allowMethodSpoofing: false,

  useAsyncLocalStorage: false,
  keepAliveTimeout: boundedHttpTimeout(
    'HTTP_KEEP_ALIVE_TIMEOUT_MS',
    env.get('HTTP_KEEP_ALIVE_TIMEOUT_MS', 5_000)
  ),
  headersTimeout: boundedHttpTimeout(
    'HTTP_HEADERS_TIMEOUT_MS',
    env.get('HTTP_HEADERS_TIMEOUT_MS', 10_000)
  ),
  requestTimeout: boundedHttpTimeout(
    'HTTP_REQUEST_TIMEOUT_MS',
    env.get('HTTP_REQUEST_TIMEOUT_MS', 30_000)
  ),
  timeout: boundedHttpTimeout('HTTP_SOCKET_TIMEOUT_MS', env.get('HTTP_SOCKET_TIMEOUT_MS', 30_000)),

  cookie: {
    domain: '',
    path: '/',
    maxAge: '2h',
    httpOnly: true,
    secure: app.inProduction,
    sameSite: 'lax',
  },
})
