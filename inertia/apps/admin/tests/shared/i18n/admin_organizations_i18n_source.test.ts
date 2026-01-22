import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const adminOrganizationSources = [
  'inertia/apps/admin/modules/organizations/index.svelte',
  'inertia/apps/admin/modules/organizations/show.svelte',
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

describe('admin organizations i18n source guard', () => {
  it('keeps English and Vietnamese admin organization resources in sync', () => {
    expect(
      flattenKeys(getNestedValue(readJson('resources/lang/en/organization.json'), ['organization', 'admin_organizations'])).sort()
    ).toEqual(
      flattenKeys(getNestedValue(readJson('resources/lang/vi/organization.json'), ['organization', 'admin_organizations'])).sort()
    )
  })

  it('routes admin organization list and detail copy through translations', () => {
    for (const sourcePath of adminOrganizationSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'currentDocumentLocale',
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        "toLocaleDateString('vi-VN'",
        "toLocaleString('vi-VN'",
        'Tổ chức',
        'Tạo tổ chức',
        'Danh sách tổ chức',
        'Chưa có mô tả',
        'Xem chi tiết',
        'Không tìm thấy tổ chức',
        'Thông tin tổ chức',
        'Owner và thống kê',
        'thành viên',
        'dự án',
        'Chưa cung cấp',
        'Tạo lúc',
        'Cập nhật gần nhất',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }
  })

  it('routes admin organization index-specific copy through translations', () => {
    const source = readSource('inertia/apps/admin/modules/organizations/index.svelte')

    for (const key of [
      "t('organization.admin_organizations.index.title'",
      "t('organization.admin_organizations.index.description'",
      "t('organization.admin_organizations.index.search_placeholder'",
      "t('organization.admin_organizations.index.create'",
      "t('organization.admin_organizations.index.list_title'",
      "t('organization.admin_organizations.index.no_description'",
      "t('organization.admin_organizations.index.members'",
      "t('organization.admin_organizations.index.projects'",
      "t('organization.admin_organizations.index.view_detail'",
      "t('organization.admin_organizations.index.empty_title'",
      "t('organization.admin_organizations.index.empty_search'",
      "t('organization.admin_organizations.index.empty_system'",
    ]) {
      expect(source).toContain(key)
    }
  })

  it('routes admin organization detail-specific copy through translations', () => {
    const source = readSource('inertia/apps/admin/modules/organizations/show.svelte')

    for (const key of [
      "t('admin_ui.organizations.show.eyebrow'",
      "t('admin_ui.organizations.show.summary'",
      "t('admin_ui.organizations.show.info_title'",
      "t('admin_ui.organizations.show.organization_id'",
      "t('admin_ui.organizations.show.name'",
      "t('admin_ui.organizations.show.description'",
      "t('admin_ui.organizations.show.stats_title'",
      "t('admin_ui.organizations.show.email_missing'",
      "t('admin_ui.organizations.show.member_count'",
      "t('admin_ui.organizations.show.project_count'",
      "t('admin_ui.organizations.show.created_at'",
      "t('admin_ui.organizations.show.updated_at'",
    ]) {
      expect(source).toContain(key)
    }
  })
})
