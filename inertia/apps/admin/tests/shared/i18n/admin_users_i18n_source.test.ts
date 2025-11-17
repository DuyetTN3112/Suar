import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const adminUserSources = [
  'inertia/apps/admin/modules/users/index.svelte',
  'inertia/apps/admin/modules/users/show.svelte',
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

describe('admin users i18n source guard', () => {
  it('keeps English and Vietnamese admin user resources in sync', () => {
    expect(flattenKeys(getNestedValue(readJson('resources/lang/en/user.json'), ['user', 'admin_users'])).sort()).toEqual(
      flattenKeys(getNestedValue(readJson('resources/lang/vi/user.json'), ['user', 'admin_users'])).sort()
    )
  })

  it('routes admin user list and detail copy through translations', () => {
    for (const sourcePath of adminUserSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'currentDocumentLocale',
        'user.admin_users.role.system_admin',
        'user.admin_users.role.member',
        'user.admin_users.status.active',
        'user.admin_users.status.suspended',
        'user.admin_users.status.pending',
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        "toLocaleDateString('vi-VN')",
        "toLocaleString('vi-VN'",
        'Người dùng hệ thống',
        'Tìm kiếm username',
        'Tất cả vai trò',
        'Admin hệ thống',
        'Người dùng thường',
        'Hoạt động',
        'Tạm khóa',
        'Chờ duyệt',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }
  })

  it('routes admin user index-specific copy through translations', () => {
    const source = readSource('inertia/apps/admin/modules/users/index.svelte')

    for (const key of [
      "t('user.admin_users.index.title'",
      "t('user.admin_users.index.description'",
      "t('user.admin_users.index.search_placeholder'",
      "t('user.admin_users.index.list_title'",
      "t('user.admin_users.index.empty_title'",
      "t('user.admin_users.index.empty_hint'",
      "t('user.admin_users.index.joined_at'",
      "t('user.admin_users.index.actions'",
      "t('user.admin_users.index.view_detail'",
      "t('user.admin_users.index.pagination_summary'",
    ]) {
      expect(source).toContain(key)
    }

    for (const forbidden of [
      'Danh sách tài khoản',
      'Không tìm thấy tài khoản phù hợp',
      'Thử đổi bộ lọc',
      'Vai trò hệ thống',
      'Trạng thái',
      'Ngày tham gia',
      'Thao tác',
      'Xem chi tiết',
      'Đang hiển thị',
    ]) {
      expect(source).not.toContain(forbidden)
    }
  })

  it('routes admin user detail-specific copy through translations', () => {
    const source = readSource('inertia/apps/admin/modules/users/show.svelte')

    for (const key of [
      "t('user.admin_users.show.account_info'",
      "t('user.admin_users.show.email_missing'",
      "t('user.admin_users.show.system_role'",
      "t('user.admin_users.show.account_status'",
      "t('user.admin_users.show.context_title'",
      "t('user.admin_users.show.current_organization'",
      "t('user.admin_users.show.no_current_organization'",
      "t('user.admin_users.show.work_account_type'",
      "t('user.admin_users.show.external_contributor'",
      "t('user.admin_users.show.created_at'",
      "t('user.admin_users.show.updated_at'",
      "t('user.admin_users.show.operations'",
      "t('user.admin_users.show.restore_account'",
      "t('user.admin_users.show.suspend_account'",
      "t('user.admin_users.show.open_audit_logs'",
      "t('user.admin_users.show.open_current_organization'",
    ]) {
      expect(source).toContain(key)
    }

    for (const forbidden of [
      'Thông tin tài khoản',
      'Chưa cung cấp',
      'Trạng thái tài khoản',
      'Ngữ cảnh và phân loại',
      'Tổ chức đang chọn',
      'Chưa có ngữ cảnh tổ chức',
      'Loại tài khoản làm việc',
      'Contributor bên ngoài',
      'Ngày tạo',
      'Cập nhật gần nhất',
      'Điều khiển vận hành',
      'Khôi phục tài khoản',
      'Tạm khóa tài khoản',
      'Mở audit logs',
      'Mở tổ chức hiện tại',
    ]) {
      expect(source).not.toContain(forbidden)
    }
  })
})
