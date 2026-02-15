import { I18n } from '@adonisjs/i18n'
import i18nManager from '@adonisjs/i18n/services/main'
import type { NextFn } from '@adonisjs/core/types/http'
import { type HttpContext, RequestValidator } from '@adonisjs/core/http'
import fs from 'node:fs/promises'
import path from 'node:path'
import app from '@adonisjs/core/services/app'
import loggerService from '#services/logger_service'

/**
 * DetectUserLocale Middleware — I18n resolution + translation sharing
 *
 * Locale resolution order:
 *   1. URL query parameter ?locale=vi
 *   2. Session stored locale
 *   3. Accept-Language header
 *   4. Default locale (vi)
 *
 * Performance:
 *   - Translation files cached in production (static Map)
 *   - Cache cleared on each request in development (hot reload)
 *   - Files read with Promise.all (parallel) thay vì sequential
 */
export default class DetectUserLocaleMiddleware {
  static {
    RequestValidator.messagesProvider = (ctx) => {
      return ctx.i18n.createMessagesProvider()
    }
  }

  private static translationsCache: Map<string, Record<string, unknown>> = new Map()

  private isValidLocale(locale: string): boolean {
    if (!locale) return false
    return i18nManager.supportedLocales().includes(locale)
  }

  /**
   * Load translations cho locale — cached in production, parallel file reads
   */
  private async loadTranslations(locale: string): Promise<Record<string, unknown>> {
    const cached = DetectUserLocaleMiddleware.translationsCache.get(locale)
    if (cached) {
      return cached
    }

    const localeDir = path.join(app.languageFilesPath(), locale)
    const translations: Record<string, unknown> = Object.create(null)

    try {
      await fs.access(localeDir)
      const files = await fs.readdir(localeDir)
      const jsonFiles = files.filter((f) => f.endsWith('.json'))

      // Parallel file reads — faster than sequential for loop
      const fileContents = await Promise.all(
        jsonFiles.map(async (file) => {
          const filePath = path.join(localeDir, file)
          const content = await fs.readFile(filePath, 'utf8')
          return { namespace: file.replace('.json', ''), content }
        })
      )

      for (const { namespace, content } of fileContents) {
        try {
          translations[namespace] = JSON.parse(content)
        } catch {
          loggerService.error(`[i18n] Failed to parse ${locale}/${namespace}.json`)
        }
      }

      DetectUserLocaleMiddleware.translationsCache.set(locale, translations)
      return translations
    } catch {
      return Object.create(null)
    }
  }

  protected getRequestLocale(ctx: HttpContext): string | undefined {
    // 1. URL query ?locale=vi
    const localeFromUrl = ctx.request.input('locale') as string | undefined
    if (localeFromUrl && this.isValidLocale(localeFromUrl)) {
      ctx.session.put('locale', localeFromUrl)
      return localeFromUrl
    }

    // 2. Session
    const localeFromSession = ctx.session.get('locale') as string | undefined
    if (localeFromSession) {
      if (this.isValidLocale(localeFromSession)) return localeFromSession
      ctx.session.forget('locale')
    }

    // 3. Accept-Language header
    const userLanguages = ctx.request.languages()
    return i18nManager.getSupportedLocaleFor(userLanguages) ?? undefined
  }

  async handle(ctx: HttpContext, next: NextFn): Promise<void> {
    // Clear cache in dev for hot reload
    if (process.env.NODE_ENV === 'development') {
      DetectUserLocaleMiddleware.translationsCache.clear()
    }

    const language = this.getRequestLocale(ctx)
    const locale = language ?? i18nManager.defaultLocale

    ctx.i18n = i18nManager.locale(locale)
    ctx.containerResolver.bindValue(I18n, ctx.i18n)

    if ('view' in ctx) {
      ctx.view.share({ i18n: ctx.i18n })
    }

    if ('inertia' in ctx) {
      const translations = await this.loadTranslations(locale)
      ctx.inertia.share({
        locale: ctx.i18n.locale,
        supportedLocales: i18nManager.supportedLocales(),
        translations,
      })
    }

    await next()
  }
}

declare module '@adonisjs/core/http' {
  export interface HttpContext {
    i18n: I18n
  }
}
