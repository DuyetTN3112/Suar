import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

function readSource(sourcePath: string): string {
  return readFileSync(resolve(process.cwd(), sourcePath), 'utf8')
}

describe('locale source guard', () => {
  it('keeps configured translation locales to English and Vietnamese only', () => {
    const configuredLocales = readdirSync(resolve(process.cwd(), 'resources/lang'), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()

    expect(configuredLocales).toEqual(['en', 'vi'])
    expect(readSource('config/i18n.ts')).toContain("supportedLocales: ['en', 'vi']")
  })

  it('keeps static language files whitelisted to English and Vietnamese only', () => {
    const source = readSource('app/modules/http/middleware/lang_static_middleware.ts')

    expect(source).toContain("SUPPORTED_LOCALES = ['en', 'vi']")
    expect(source).toContain('LangStaticMiddleware.SUPPORTED_LOCALES.includes(locale)')
    expect(source).not.toContain('LOCALE_PATTERN')
  })

  it('keeps Inertia document language tied to the active locale', () => {
    for (const sourcePath of [
      'resources/views/inertia_layout.edge',
      'resources/views/inertia_user.edge',
      'resources/views/inertia_org.edge',
      'resources/views/inertia_admin.edge',
    ]) {
      const source = readSource(sourcePath)

      expect(source).toContain('<html lang="{{ i18n?.locale ?? \'en\' }}">')
      expect(source).not.toContain('<html lang="vi">')
    }
  })
})
