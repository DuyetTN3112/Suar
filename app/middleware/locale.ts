import type { HttpContext } from '@adonisjs/core/http'
import app from '@adonisjs/core/services/app'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Middleware để xử lý ngôn ngữ trong ứng dụng
 */
export default class LocaleMiddleware {
  /**
   * Danh sách ngôn ngữ được hỗ trợ
   */
  supportedLocales = ['en', 'vi']

  /**
   * Tên file chỉ mục chứa thông tin cơ bản về ngôn ngữ
   */
  indexFile = 'index.json'
  /**
   * Handle HTTP request
   */
  async handle(ctx: HttpContext, next: () => Promise<void>) {
    const { request, session } = ctx
    // Lấy locale từ query string hoặc session hoặc mặc định là 'en'
    const locale = request.input('locale') || session.get('locale') || 'en'
    // Chỉ lấy locale được hỗ trợ
    const selectedLocale = this.supportedLocales.includes(locale) ? locale : 'en'
    // Lưu locale vào session
    session.put('locale', selectedLocale)

    // Lấy thông tin ngôn ngữ
    const langInfo = this.getLanguageInfo(selectedLocale)
    // Chia sẻ thông tin locale với tất cả views qua Inertia
    ctx.inertia?.share({
      locale: selectedLocale,
      localeInfo: langInfo,
    })
    await next()
  }

  /**
   * Lấy thông tin cơ bản về ngôn ngữ từ file index.json
   */
  private getLanguageInfo(locale: string) {
    const resourcesPath = app.makePath('resources')
    const langPath = join(resourcesPath, 'lang', locale)
    const indexFilePath = join(langPath, this.indexFile)
    if (existsSync(indexFilePath)) {
      try {
        const fileContent = readFileSync(indexFilePath, 'utf-8')
        return JSON.parse(fileContent)
      } catch (error) {
        console.error(`Failed to read language info for locale ${locale}:`, error)
      }
    }
    return { name: locale, code: locale }
  }
}
