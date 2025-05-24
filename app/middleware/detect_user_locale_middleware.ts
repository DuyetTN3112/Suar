import { I18n } from '@adonisjs/i18n'
import i18nManager from '@adonisjs/i18n/services/main'
import type { NextFn } from '@adonisjs/core/types/http'
import { type HttpContext, RequestValidator } from '@adonisjs/core/http'
import fs from 'node:fs/promises'
import path from 'node:path'
import app from '@adonisjs/core/services/app'
// import env from '#start/env' // unused

// Mức độ log cho i18n
// type I18nLogLevel = 'none' | 'minimal' | 'normal' | 'verbose' // unused
// const I18N_LOG_LEVEL: I18nLogLevel = env.get('I18N_LOG_LEVEL', 'none') as I18nLogLevel // unused

// function i18nLog(level: I18nLogLevel, message: string, ...args: any[]) { /* unused */ }

// Luôn log lỗi bất kể mức độ log hiện tại
function i18nError(message: string, ...args: any[]) {
  // Keep error logging but disable in production by default
  if (process.env.NODE_ENV === 'development') {
    console.error(`[i18n] ${message}`, ...args)
  }
}

/**
 * The "DetectUserLocaleMiddleware" middleware uses i18n service to share
 * a request specific i18n object with the HTTP Context
 */
export default class DetectUserLocaleMiddleware {
  /**
   * Using i18n for validation messages. Applicable to only
   * "request.validateUsing" method calls
   */
  static {
    RequestValidator.messagesProvider = (ctx) => {
      return ctx.i18n.createMessagesProvider()
    }
  }

  /**
   * Cache cho dữ liệu dịch để tránh đọc file lặp lại
   */
  private static translationsCache: Record<string, any> = {}

  /**
   * Kiểm tra xem locale có hợp lệ không
   */
  private isValidLocale(locale: string): boolean {
    if (!locale) return false
    const supportedLocales = i18nManager.supportedLocales()
    const isValid = supportedLocales.includes(locale)
    // Chỉ log khi locale không hợp lệ
    if (!isValid) {
      // Keep error logging but disable in production
      i18nError(`Locale '${locale}' is not valid. Supported: ${supportedLocales.join(', ')}`)
    }
    return isValid
  }

  /**
   * Đọc tất cả dữ liệu dịch cho một ngôn ngữ cụ thể
   */
  private async loadTranslations(locale: string) {
    // Kiểm tra cache trước
    if (DetectUserLocaleMiddleware.translationsCache[locale]) {
      return DetectUserLocaleMiddleware.translationsCache[locale]
    }

    const localeDir = path.join(app.languageFilesPath(), locale)
    const translations: Record<string, any> = {}

    try {
      // Kiểm tra xem thư mục có tồn tại không
      await fs.access(localeDir)
      // Đọc tất cả các file trong thư mục
      const files = await fs.readdir(localeDir)
      // Removed debug log: i18nLog('minimal', `Loading ${files.length} translation files for locale '${locale}'`)
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(localeDir, file)
          const content = await fs.readFile(filePath, 'utf8')
          const namespace = file.replace('.json', '')
          try {
            translations[namespace] = JSON.parse(content)
          } catch (error) {
            // Keep error logging but disable in production
            i18nError(`Error parsing translation file ${filePath}:`, error)
          }
        }
      }

      // Lưu vào cache
      DetectUserLocaleMiddleware.translationsCache[locale] = translations
      return translations
    } catch (error) {
      // Keep error logging but disable in production
      i18nError(`Cannot load translations for locale '${locale}':`, error)
      return {}
    }
  }

  /**
   * This method checks for locale in the following order:
   * 1. URL query parameter "locale"
   * 2. Session stored locale
   * 3. Accept-Language header
   *
   * If a locale is found from URL, it's stored in session for future requests
   */
  protected getRequestLocale(ctx: HttpContext) {
    // Kiểm tra tham số locale trong URL (ưu tiên cao nhất)
    const localeFromUrl = ctx.request.input('locale')
    if (localeFromUrl && this.isValidLocale(localeFromUrl)) {
      // Lưu vào session cho các request sau
      if (ctx.session) {
        ctx.session.put('locale', localeFromUrl)
      }
      return localeFromUrl
    }
    // Kiểm tra locale trong session
    if (ctx.session && ctx.session.get('locale')) {
      const localeFromSession = ctx.session.get('locale')
      if (this.isValidLocale(localeFromSession)) {
        return localeFromSession
      } else {
        ctx.session.forget('locale')
      }
    }

    // Fallback to Accept-Language header
    const userLanguages = ctx.request.languages()
    const supportedLocale = i18nManager.getSupportedLocaleFor(userLanguages)
    return supportedLocale
  }

  async handle(ctx: HttpContext, next: NextFn) {
    // Chỉ log các request quan trọng - không log tài nguyên tĩnh
    // const url = ctx.request.url() // unused
    // const isStaticResource =
    //   url.includes('.') ||
    //   url.includes('/assets/') ||
    //   url.includes('/public/') ||
    //   url.includes('/favicon.ico') // unused
    // Removed debug log: i18nLog('verbose', `Processing request: ${ctx.request.method()} ${url}`)

    /**
     * Xóa cache dịch nếu đang trong môi trường phát triển để đảm bảo nhận được bản dịch mới nhất
     */
    if (process.env.NODE_ENV === 'development') {
      DetectUserLocaleMiddleware.translationsCache = {}
    }
    /**
     * Finding user language
     */
    const language = this.getRequestLocale(ctx)
    const locale = language || i18nManager.defaultLocale
    // Removed debug log: i18nLog('normal', `Selected locale: ${locale}`)

    /**
     * Assigning i18n property to the HTTP context
     */
    ctx.i18n = i18nManager.locale(locale)

    /**
     * Binding I18n class to the request specific instance of it.
     */
    ctx.containerResolver.bindValue(I18n, ctx.i18n)

    /**
     * Sharing with edge templates if available
     */
    if ('view' in ctx) {
      ctx.view.share({ i18n: ctx.i18n })
    }

    /**
     * Tải dữ liệu dịch và chia sẻ với Inertia
     */
    if ('inertia' in ctx) {
      const translations = await this.loadTranslations(locale)
      ctx.inertia.share({
        locale: ctx.i18n.locale,
        supportedLocales: i18nManager.supportedLocales(),
        translations,
      })
    }

    return next()
  }
}

/**
 * Notify TypeScript about i18n property
 */
declare module '@adonisjs/core/http' {
  export interface HttpContext {
    i18n: I18n
  }
}
