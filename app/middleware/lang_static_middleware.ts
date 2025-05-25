import type { HttpContext } from '@adonisjs/core/http'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import app from '@adonisjs/core/services/app'

/**
 * Middleware để phục vụ các file ngôn ngữ tĩnh từ thư mục resources/lang
 */
export default class LangStaticMiddleware {
  /**
   * Xử lý các yêu cầu đến file ngôn ngữ
   */
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const { request, response } = ctx
    const url = request.url()

    // Chỉ xử lý các yêu cầu đến đường dẫn /lang/
    if (url.startsWith('/lang/')) {
      try {
        // Tách đường dẫn URL: /lang/en/common.json -> ["", "lang", "en", "common.json"]
        const parts = url.split('/')

        // Đảm bảo định dạng URL hợp lệ: /lang/{locale}/{file.json}
        if (parts.length < 4) {
          // Removed debug log: console.log(`[LangStaticMiddleware] Invalid URL format: ${url}`)
          return response.status(404).send('Not Found')
        }

        const locale = parts[2]
        const file = parts[3]

        // Kiểm tra tệp có hợp lệ không
        if (!file.endsWith('.json')) {
          // Removed debug log: console.log(`[LangStaticMiddleware] Not a JSON file: ${file}`)
          return response.status(404).send('Not Found')
        }

        // Tạo đường dẫn tới tệp ngôn ngữ
        const resourcesPath = app.makePath('resources')
        const langPath = join(resourcesPath, 'lang', locale, file)

        // Kiểm tra tệp có tồn tại không
        if (!existsSync(langPath)) {
          // Removed debug log: console.log(`[LangStaticMiddleware] File not found: ${langPath}`)
          return response.status(404).send('Not Found')
        }

        // Đặt header Content-Type phù hợp
        response.header('Content-Type', 'application/json')
        // Phục vụ file ngôn ngữ
        return response.download(langPath)
      } catch (error) {
        // Keep error logging for actual errors
        console.error(`[LangStaticMiddleware] Error:`, error)
        return response.status(500).send('Internal Server Error')
      }
    }
    // Chuyển tiếp cho middleware tiếp theo nếu không phải yêu cầu file ngôn ngữ
    return next()
  }
}
