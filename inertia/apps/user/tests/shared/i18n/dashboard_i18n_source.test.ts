import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const dashboardSources = [
  'inertia/apps/user/modules/dashboard/index.svelte',
  'inertia/apps/org/modules/dashboard/index.svelte',
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

describe('dashboard i18n source guard', () => {
  it('keeps English and Vietnamese dashboard resources in sync', () => {
    expect(flattenKeys(getNestedValue(readJson('resources/lang/en/user.json'), ['user', 'dashboard'])).sort()).toEqual(
      flattenKeys(getNestedValue(readJson('resources/lang/vi/user.json'), ['user', 'dashboard'])).sort()
    )
    expect(flattenKeys(getNestedValue(readJson('resources/lang/en/organization.json'), ['organization', 'dashboard'])).sort()).toEqual(
      flattenKeys(getNestedValue(readJson('resources/lang/vi/organization.json'), ['organization', 'dashboard'])).sort()
    )
  })

  it('routes user and org dashboard copy through translations', () => {
    for (const sourcePath of dashboardSources) {
      const source = readSource(sourcePath)

      expect(source).toContain('useTranslation()')
      expect(source).toMatch(/t\('(user|organization)\.dashboard\./)

      for (const forbidden of [
        'Tổng quan cá nhân',
        'Hôm nay của',
        'Gom việc cá nhân',
        'tổ chức trong workspace',
        'Cần xử lý',
        'Mở review board',
        'Đi tới',
        'Công việc',
        'Hồ sơ và tín hiệu',
        'Tổng quan tổ chức',
        'Tổ chức hiện tại',
        'Theo dõi thành viên',
        'Cấu hình',
        'lời mời chờ',
        'đang chạy',
        'đang xử lý',
        'thành viên có tranh chấp',
        'Vai trò trong tổ chức',
        'Điều phối nhanh',
        'Danh mục dự án',
        'Thành viên tổ chức',
        'Audit log tổ chức',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }
  })
})
