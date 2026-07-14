import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const searchHeaderSources = [
  'inertia/apps/user/modules/search/components/search_header.svelte',
  'inertia/apps/org/modules/search/components/search_header.svelte',
] as const

function readSource(sourcePath: string): string {
  return readFileSync(resolve(process.cwd(), sourcePath), 'utf8')
}

function readJson(path: string): unknown {
  return JSON.parse(readSource(path)) as unknown
}

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return prefix ? [prefix] : []
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key
    return flattenKeys(child, nextPrefix)
  })
}

function getNestedValue(value: unknown, keys: string[]): unknown {
  let current = value

  for (const key of keys) {
    if (typeof current !== 'object' || current === null || Array.isArray(current)) {
      return undefined
    }

    current = (current as Record<string, unknown>)[key]
  }

  return current
}

describe('search i18n source guard', () => {
  it('keeps English and Vietnamese search center resources in sync', () => {
    expect(flattenKeys(getNestedValue(readJson('resources/lang/en/common.json'), ['search_center'])).sort()).toEqual(
      flattenKeys(getNestedValue(readJson('resources/lang/vi/common.json'), ['search_center'])).sort()
    )
  })

  it('routes search header copy through translations', () => {
    for (const sourcePath of searchHeaderSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'search_center.title',
        'search_center.subtitle',
        'search_center.coverage_value',
        'search_center.match.exact',
        'search_center.placeholder',
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toContain('Một nơi tìm tất cả')
      expect(source).not.toContain('match nằm ở đâu')
    }
  })
})
