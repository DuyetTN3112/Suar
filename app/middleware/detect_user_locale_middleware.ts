import { I18n } from '@adonisjs/i18n'
import i18nManager from '@adonisjs/i18n/services/main'
import type { NextFn } from '@adonisjs/core/types/http'
import { type HttpContext, RequestValidator } from '@adonisjs/core/http'
import fs from 'node:fs/promises'
import path from 'node:path'
import app from '@adonisjs/core/services/app'

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
    console.log(
      `[i18n] Checking if locale '${locale}' is valid:`,
      isValid,
      `(supported: ${supportedLocales.join(', ')})`
    )
    return isValid
  }

  /**
   * Đọc tất cả dữ liệu dịch cho một ngôn ngữ cụ thể
   */
  private async loadTranslations(locale: string) {
    console.log(`[i18n] Loading translations for locale: ${locale}`)
    // Kiểm tra cache trước
    if (DetectUserLocaleMiddleware.translationsCache[locale]) {
      console.log(`[i18n] Using cached translations for ${locale}`)
      return DetectUserLocaleMiddleware.translationsCache[locale]
    }

    const localeDir = path.join(app.languageFilesPath(), locale)
    console.log(`[i18n] Loading from directory: ${localeDir}`)
    const translations: Record<string, any> = {}

    try {
      // Kiểm tra xem thư mục có tồn tại không
      await fs.access(localeDir)
      // Đọc tất cả các file trong thư mục
      const files = await fs.readdir(localeDir)
      console.log(`[i18n] Found ${files.length} files in ${locale} directory`)
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(localeDir, file)
          const content = await fs.readFile(filePath, 'utf8')
          const namespace = file.replace('.json', '')
          try {
            translations[namespace] = JSON.parse(content)
            console.log(
              `[i18n] Loaded ${namespace} namespace with ${Object.keys(translations[namespace]).length} keys`
            )
          } catch (error) {
            console.error(`Lỗi khi parse file ${filePath}:`, error)
          }
        }
      }

      // Log tất cả các namespace đã tải
      console.log(`[i18n] Loaded namespaces for ${locale}:`, Object.keys(translations))
      // Kiểm tra một số key quan trọng
      if (translations.messages) {
        const testKeys = ['users', 'common.actions', 'user.status']
        testKeys.forEach((key) => {
          const parts = key.split('.')
          let current = translations.messages
          for (const part of parts) {
            if (current && typeof current === 'object') {
              current = current[part]
            } else {
              current = undefined
              break
            }
          }
          console.log(`[i18n] Test key 'messages.${key}' exists:`, !!current)
        })
      }

      // Lưu vào cache
      DetectUserLocaleMiddleware.translationsCache[locale] = translations
      return translations
    } catch (error) {
      console.error(`Không thể đọc dữ liệu dịch cho ngôn ngữ ${locale}:`, error)
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
    console.log('[i18n] Starting locale detection...')
    // Kiểm tra tham số locale trong URL (ưu tiên cao nhất)
    const localeFromUrl = ctx.request.input('locale')
    console.log('[i18n] Locale from URL parameter:', localeFromUrl)
    if (localeFromUrl && this.isValidLocale(localeFromUrl)) {
      console.log(`[i18n] Using locale from URL: ${localeFromUrl}`)
      // Lưu vào session cho các request sau
      if (ctx.session) {
        ctx.session.put('locale', localeFromUrl)
        console.log(`[i18n] Saved locale '${localeFromUrl}' to session`)
      }
      return localeFromUrl
    }
    // Kiểm tra locale trong session
    if (ctx.session && ctx.session.get('locale')) {
      const localeFromSession = ctx.session.get('locale')
      console.log('[i18n] Locale from session:', localeFromSession)
      if (this.isValidLocale(localeFromSession)) {
        console.log(`[i18n] Using locale from session: ${localeFromSession}`)
        return localeFromSession
      } else {
        console.log(
          `[i18n] Session locale '${localeFromSession}' is invalid, removing from session`
        )
        ctx.session.forget('locale')
      }
    }

    // Fallback to Accept-Language header
    const userLanguages = ctx.request.languages()
    console.log('[i18n] User languages from Accept-Language:', userLanguages)
    const supportedLocale = i18nManager.getSupportedLocaleFor(userLanguages)
    console.log('[i18n] Selected locale from Accept-Language:', supportedLocale)
    return supportedLocale
  }

  async handle(ctx: HttpContext, next: NextFn) {
    console.log('\n[i18n] ===== Starting locale detection for request =====')
    console.log(`[i18n] Request URL: ${ctx.request.url()}`)
    console.log(`[i18n] Request method: ${ctx.request.method()}`)
    /**
     * Xóa cache dịch nếu đang trong môi trường phát triển để đảm bảo nhận được bản dịch mới nhất
     */
    if (process.env.NODE_ENV === 'development') {
      DetectUserLocaleMiddleware.translationsCache = {}
      console.log('[i18n] Translation cache cleared in development mode')
    }
    /**
     * Finding user language
     */
    const language = this.getRequestLocale(ctx)
    const locale = language || i18nManager.defaultLocale
    console.log(`[i18n] Final selected locale: ${locale}`)

    /**
     * Assigning i18n property to the HTTP context
     */
    ctx.i18n = i18nManager.locale(locale)

    /**
     * Binding I18n class to the request specific instance of it.
     * Doing so will allow IoC container to resolve an instance
     * of request specific i18n object when I18n class is
     * injected somewhere.
     */
    ctx.containerResolver.bindValue(I18n, ctx.i18n)

    /**
     * Sharing request specific instance of i18n with edge
     * templates.
     *
     * Remove the following block of code, if you are not using
     * edge templates.
     */
    if ('view' in ctx) {
      ctx.view.share({ i18n: ctx.i18n })
      console.log('[i18n] Shared i18n with edge templates')
    }

    /**
     * Tải dữ liệu dịch và chia sẻ với Inertia
     */
    if ('inertia' in ctx) {
      const translations = await this.loadTranslations(locale)
      console.log(
        `[i18n] Loaded translations for '${locale}', found ${Object.keys(translations).length} namespaces`
      )
      ctx.inertia.share({
        locale: ctx.i18n.locale,
        supportedLocales: i18nManager.supportedLocales(),
        translations,
      })
      console.log('[i18n] Shared translations with Inertia')
    }

    console.log('[i18n] ===== Completed locale setup =====\n')
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
