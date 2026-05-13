import { access } from 'node:fs/promises'
import { join } from 'node:path'

import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'

import loggerService from '#infra/logger/logger_service'
import { HttpStatus } from '#modules/errors/constants/error_constants'

/**
 * Middleware để phục vụ các file ngôn ngữ tĩnh từ thư mục resources/lang.
 *
 * FIX BẢO MẬT: Whitelist locale pattern, chặn path traversal.
 * FIX PERFORMANCE: Dùng async fs.access thay vì existsSync (blocking).
 */
export default class LangStaticMiddleware {
  /**
   * Regex an toàn: locale chỉ chấp nhận 2-5 ký tự chữ thường (ví dụ: en, vi, pt-BR)
   */
  private static readonly LOCALE_PATTERN = /^[a-z]{2}(-[A-Z]{2})?$/

  /**
   * Regex an toàn: filename chỉ chấp nhận chữ, số, gạch dưới, gạch ngang + .json
   */
  private static readonly FILENAME_PATTERN = /^[\w-]+\.json$/

  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const { request, response } = ctx
    const url = request.url()

    // Chỉ xử lý các yêu cầu đến đường dẫn /lang/
    if (!url.startsWith('/lang/')) {
      return next()
    }

    try {
      // Tách đường dẫn URL: /lang/en/common.json → ["", "lang", "en", "common.json"]
      const parts = url.split('/')

      if (parts.length < 4) {
        response.status(HttpStatus.NOT_FOUND).send('Not Found')
        return
      }

      const locale = parts[2]
      const file = parts[3]

      // === SECURITY: Validate locale và filename chống path traversal ===
      if (!locale || !LangStaticMiddleware.LOCALE_PATTERN.test(locale)) {
        response.status(HttpStatus.BAD_REQUEST).send('Invalid locale')
        return
      }

      if (!file || !LangStaticMiddleware.FILENAME_PATTERN.test(file)) {
        response.status(HttpStatus.BAD_REQUEST).send('Invalid filename')
        return
      }

      // Tạo đường dẫn tuyệt đối
      const resourcesPath = app.makePath('resources')
      const langPath = join(resourcesPath, 'lang', locale, file)

      // === SECURITY: Double-check path nằm trong thư mục lang ===
      const expectedPrefix = join(resourcesPath, 'lang')
      if (!langPath.startsWith(expectedPrefix)) {
        response.status(HttpStatus.FORBIDDEN).send('Forbidden')
        return
      }

      // === PERFORMANCE: Async file access thay vì existsSync ===
      try {
        await access(langPath)
      } catch {
        response.status(HttpStatus.NOT_FOUND).send('Not Found')
        return
      }

      // Cache-Control cho lang files (immutable trong production)
      response.header('Content-Type', 'application/json')
      response.header('Cache-Control', 'public, max-age=3600')
      response.download(langPath)
    } catch (error) {
      loggerService.error('[LangStaticMiddleware] Error:', error)
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Internal Server Error')
    }
  }
}
