import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const requireOrganizationSources = [
  'inertia/apps/user/modules/errors/require_organization.svelte',
  'inertia/apps/org/modules/errors/require_organization.svelte',
  'inertia/apps/admin/modules/errors/require_organization.svelte',
] as const

const serverErrorSources = [
  'inertia/apps/user/modules/errors/server_error.svelte',
  'inertia/apps/org/modules/errors/server_error.svelte',
  'inertia/apps/admin/modules/errors/server_error.svelte',
] as const

const customErrorSources = [
  'inertia/apps/user/modules/errors/custom_error.svelte',
  'inertia/apps/org/modules/errors/custom_error.svelte',
  'inertia/apps/admin/modules/errors/custom_error.svelte',
] as const

const notFoundSources = [
  'inertia/apps/user/modules/errors/not_found.svelte',
  'inertia/apps/org/modules/errors/not_found.svelte',
  'inertia/apps/admin/modules/errors/not_found.svelte',
] as const

const forbiddenSources = [
  'inertia/apps/user/modules/errors/forbidden.svelte',
  'inertia/apps/org/modules/errors/forbidden.svelte',
  'inertia/apps/admin/modules/errors/forbidden.svelte',
] as const

function readSource(sourcePath: string): string {
  return readFileSync(resolve(process.cwd(), sourcePath), 'utf8')
}

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readSource(path)) as Record<string, unknown>
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

describe('error pages i18n source guard', () => {
  it('keeps English and Vietnamese error page resources in sync', () => {
    expect(flattenKeys(readJson('resources/lang/en/common.json').error_pages).sort()).toEqual(
      flattenKeys(readJson('resources/lang/vi/common.json').error_pages).sort()
    )
  })

  it('routes require-organization pages through translations', () => {
    for (const sourcePath of requireOrganizationSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('common.error_pages.require_organization.title'",
        "t('common.error_pages.require_organization.heading'",
        "t('common.error_pages.require_organization.subtitle'",
        "t('common.error_pages.require_organization.description'",
        "t('common.error_pages.require_organization.available_title'",
        "t('common.error_pages.require_organization.no_match'",
        "t('common.error_pages.require_organization.no_description'",
        "t('common.error_pages.require_organization.website_label'",
        "t('common.error_pages.require_organization.join_button'",
        "'common.error_pages.require_organization.page_count'",
        "t('common.error_pages.require_organization.view_organizations'",
        "t('common.error_pages.require_organization.create_organization'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Cần tham gia tổ chức',
        'Cần có tổ chức',
        'Bạn cần tham gia',
        'Để sử dụng đầy đủ',
        'Danh sách tổ chức',
        'Không có tổ chức nào',
        'Không có mô tả',
        'Tham gia <',
        'Trang {pagination',
        'Xem tổ chức',
        'Tạo tổ chức',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }
  })

  it('routes server-error, custom-error, not-found, and forbidden pages through translations', () => {
    for (const sourcePath of [
      ...serverErrorSources,
      ...customErrorSources,
      ...notFoundSources,
      ...forbiddenSources,
    ]) {
      const source = readSource(sourcePath)

      expect(source).toContain('useTranslation()')
      expect(source).not.toContain('Lỗi Hệ Thống')
      expect(source).not.toContain('Lỗi máy chủ')
      expect(source).not.toContain('Đã xảy ra lỗi không xác định')
      expect(source).not.toContain('Tải lại trang')
      expect(source).not.toContain('Không tìm thấy trang')
      expect(source).not.toContain('Trang bạn đang tìm kiếm')
      expect(source).not.toContain('Quay lại trang chủ')
      expect(source).not.toContain('Không có quyền truy cập')
      expect(source).not.toContain('Bạn không có quyền truy cập')
      expect(source).not.toContain('Quay lại')
      expect(source).not.toContain('Trang chủ')
    }

    for (const sourcePath of serverErrorSources) {
      const source = readSource(sourcePath)

      expect(source).toContain("t('common.error_pages.server_error.title'")
      expect(source).toContain("t('common.error_pages.server_error.default_message'")
      expect(source).toContain("t('common.error_pages.server_error.type_label'")
      expect(source).toContain("t('common.error_pages.server_error.reload'")
    }

    for (const sourcePath of customErrorSources) {
      const source = readSource(sourcePath)

      expect(source).toContain("t('common.error_pages.custom_error.title'")
      expect(source).toContain("t('common.error_pages.custom_error.default_message'")
      expect(source).toContain("t('common.error_pages.custom_error.reload'")
    }

    for (const sourcePath of notFoundSources) {
      const source = readSource(sourcePath)

      expect(source).toContain("t('common.error_pages.not_found.title'")
      expect(source).toContain("t('common.error_pages.not_found.description'")
      expect(source).toContain("t('common.error_pages.not_found.home'")
    }

    for (const sourcePath of forbiddenSources) {
      const source = readSource(sourcePath)

      expect(source).toContain("t('common.error_pages.forbidden.title'")
      expect(source).toContain("t('common.error_pages.forbidden.heading'")
      expect(source).toContain("t('common.error_pages.forbidden.description'")
      expect(source).toContain("t('common.error_pages.forbidden.back'")
      expect(source).toContain("t('common.error_pages.forbidden.home'")
    }
  })
})
