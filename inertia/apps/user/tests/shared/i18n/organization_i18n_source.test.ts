import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const organizationIndexSources = [
  'inertia/apps/user/modules/organizations/index.svelte',
  'inertia/apps/org/modules/organizations/index.svelte',
] as const

const organizationShowSources = [
  'inertia/apps/user/modules/organizations/show.svelte',
  'inertia/apps/org/modules/organizations/show.svelte',
] as const

const organizationAllSources = [
  'inertia/apps/user/modules/organizations/all.svelte',
  'inertia/apps/org/modules/organizations/all.svelte',
] as const

const organizationDetailDialogSources = [
  'inertia/apps/user/modules/organizations/components/organization_detail_dialog.svelte',
  'inertia/apps/org/modules/organizations/components/organization_detail_dialog.svelte',
] as const

const organizationCardSources = [
  'inertia/apps/user/modules/organizations/components/organization_card.svelte',
  'inertia/apps/org/modules/organizations/components/organization_card.svelte',
] as const

const organizationListSources = [
  'inertia/apps/user/modules/organizations/components/organization_list.svelte',
  'inertia/apps/org/modules/organizations/components/organization_list.svelte',
] as const

const organizationSwitcherSources = [
  'inertia/apps/user/modules/organizations/components/organization_switcher.svelte',
  'inertia/apps/org/modules/organizations/components/organization_switcher.svelte',
] as const

const organizationHeaderSources = [
  'inertia/apps/user/modules/organizations/components/organization_header.svelte',
  'inertia/apps/org/modules/organizations/components/organization_header.svelte',
] as const

const organizationAvailableSources = [
  'inertia/apps/user/modules/organizations/components/organization_available_section.svelte',
  'inertia/apps/org/modules/organizations/components/organization_available_section.svelte',
] as const

const organizationMembershipSources = [
  'inertia/apps/user/modules/organizations/components/organization_user_memberships_section.svelte',
  'inertia/apps/org/modules/organizations/components/organization_user_memberships_section.svelte',
] as const

const organizationCreateSources = [
  'inertia/apps/user/modules/organizations/create.svelte',
  'inertia/apps/org/modules/organizations/create.svelte',
] as const

const organizationRequiredDialogSources = [
  'inertia/apps/user/modules/organizations/components/organization_required_simple_dialog.svelte',
  'inertia/apps/org/modules/organizations/components/organization_required_simple_dialog.svelte',
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

describe('organization i18n source guard', () => {
  it('keeps English and Vietnamese organization resources in sync', () => {
    expect(flattenKeys(readJson('resources/lang/en/organization.json')).sort()).toEqual(
      flattenKeys(readJson('resources/lang/vi/organization.json')).sort()
    )
  })

  it('routes organization index copy through translations', () => {
    for (const sourcePath of organizationIndexSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('organization.index.page_title'",
        "t('organization.index.title'",
        "t('organization.index.subtitle_joined'",
        "t('organization.index.subtitle_empty'",
        "t('organization.index.create_button'",
        "t('organization.index.joined_stat'",
        "t('organization.index.projects_stat'",
        "t('organization.index.available_stat'",
        "t('organization.index.clear_filters'",
        "t('organization.index.joined_tab'",
        "t('organization.index.available_tab'",
        "t('organization.index.empty_joined_title'",
        "t('organization.index.empty_joined_description'",
        "t('organization.index.view_available'",
        "t('organization.index.empty_available_match_title'",
        "t('organization.index.empty_available_title'",
        "t('organization.index.empty_available_match_description'",
        "t('organization.index.empty_available_description'",
        "t('organization.index.filter_plan'",
        "t('organization.index.filter_partner_type'",
        "t('organization.index.filter_partner_status'",
        "t('organization.index.join_current'",
        "t('organization.index.join_switch'",
        "t('organization.index.join_pending'",
        "t('organization.index.join_retry'",
        "t('organization.index.join_button'",
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toContain('Danh sách tổ chức')
      expect(source).not.toContain('Tạo tổ chức mới')
      expect(source).not.toContain('Bạn chưa thuộc tổ chức nào')
      expect(source).not.toContain('Xóa filter')
      expect(source).not.toContain('Đã tham gia')
      expect(source).not.toContain('Khả dụng')
      expect(source).not.toContain('Không tìm thấy tổ chức nào')
      expect(source).not.toContain('bg-white')
    }
  })

  it('routes organization show copy and dates through translations', () => {
    for (const sourcePath of organizationShowSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'currentDocumentLocale',
        'Intl.DateTimeFormat',
        '`organization.show.review_target.${type}`',
        "t('organization.show.reviewer_anonymous'",
        "t('organization.show.reviewer_member'",
        "t('organization.show.reviewer_org_member'",
        "t('organization.show.date_unknown'",
        "t('organization.show.page_title'",
        "t('organization.show.back_to_list'",
        "t('organization.show.created_label'",
        "t('organization.show.members_tab'",
        "t('organization.show.projects_tab'",
        "t('organization.show.reviews_tab'",
        "t('organization.show.members_title'",
        "t('organization.show.invite_members'",
        "t('organization.show.members_empty'",
        "t('organization.show.member_name_header'",
        "t('organization.show.member_role_header'",
        "t('organization.show.member_actions_header'",
        "t('organization.show.view_user'",
        "t('organization.show.manage_org_projects'",
        "t('organization.show.general_project_list'",
        "t('organization.show.reviews_description'",
        "t('organization.show.open_reverse_review_center'",
        "t('organization.show.total_reviews'",
        "t('organization.show.average_rating'",
        "t('organization.show.anonymous_reviews'",
        "t('organization.show.sprint_reviews_title'",
        "t('organization.show.anonymous_count'",
        "t('organization.show.sprint_reviews_empty'",
        "t('organization.show.reviews_empty'",
        "t('organization.show.no_review_comment'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Chi tiết tổ chức',
        'Quay lại danh sách',
        'Ngày tạo:',
        'Thành viên (',
        'Danh sách thành viên',
        'Mời thành viên',
        'Tổ chức chưa có thành viên nào',
        'Vai trò',
        'Thao tác',
        'Xem user',
        'Quản trị dự án tổ chức',
        'Danh sách dự án tổng quát',
        'Review tổ chức',
        'Gom review môi trường',
        'Mở lịch sử review môi trường',
        'Mở board review môi trường',
        'Tổng review',
        'Điểm trung bình',
        'Review ẩn danh',
        'Review sau sprint toàn tổ chức',
        'Ẩn danh',
        'Chưa có review',
        'Không có nhận xét chi tiết.',
        'formatDate',
        'bg-white',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }
  })

  it('routes all-organization screen copy through translations', () => {
    for (const sourcePath of organizationAllSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('organization.index.page_title'",
        "t('organization.index.title'",
        "t('organization.no_organizations'",
        "t('organization.index.switch_success'",
        "t('organization.index.switch_error'",
        "t('organization.index.csrf_missing'",
        "t('organization.index.join_success'",
        "t('organization.index.join_error'",
        "t('organization.index.request_error'",
        "t('organization.index.join_current'",
        "t('organization.index.join_switch'",
        "t('organization.index.join_pending'",
        "t('organization.index.join_button'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Tất cả tổ chức',
        'Không tìm thấy tổ chức nào',
        'Hiện tại',
        'Chuyển đổi',
        'Đang chờ duyệt',
        'Không thể tham gia tổ chức',
        'Đã xảy ra lỗi',
      ]) {
        expect(source).not.toContain(forbidden)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes organization reusable component copy through translations and dark-safe pending badges', () => {
    for (const sourcePath of organizationDetailDialogSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('organization.detail_dialog.joined_badge'",
        "t('organization.detail_dialog.pending_badge'",
        "t('organization.detail_dialog.description_title'",
        "t('organization.no_description'",
        "t('organization.detail_dialog.not_provided'",
        "t('organization.detail_dialog.founded_year'",
        "t('organization.detail_dialog.employee_count'",
        "t('organization.detail_dialog.project_count'",
        "t('organization.detail_dialog.status'",
        "t('organization.detail_dialog.close'",
        'bg-amber-500/10',
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toMatch(/\bbg-amber-50\b/)
    }

    for (const sourcePath of organizationCardSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('organization.index.join_current'",
        "t('organization.no_description'",
        "t('organization.role_label'",
        "t('organization.view_detail'",
        "t('organization.select'",
        "t('organization.index.join_button'",
      ]) {
        expect(source).toContain(key)
      }
    }

    for (const sourcePath of organizationListSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('organization.list.empty_title'",
        "t('organization.list.empty_description'",
        "t('organization.index.create_button'",
      ]) {
        expect(source).toContain(key)
      }
    }

    for (const sourcePath of organizationSwitcherSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('organization.switcher.invalid_id'",
        "t('organization.switcher.switch_success'",
        "t('organization.switcher.switch_error'",
        "t('organization.switcher.switching'",
        "t('organization.switcher.switch'",
      ]) {
        expect(source).toContain(key)
      }
    }

    for (const sourcePath of organizationHeaderSources) {
      const source = readSource(sourcePath)

      expect(source).toContain('useTranslation()')
      expect(source).toContain("t('organization.index.create_button'")
    }

    for (const sourcePath of organizationAvailableSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('organization.index.open_network'",
        "t('organization.index.available_title'",
        "t('organization.index.results_count'",
        "t('organization.memberships.joined_badge'",
        "t('organization.detail_dialog.pending_badge'",
        "t('organization.no_description'",
        "t('organization.detail_dialog.employee_count'",
        "t('organization.detail_dialog.project_count'",
        "t('organization.memberships.location_unknown'",
        "t('organization.memberships.website_missing'",
        "t('organization.memberships.uncategorized'",
        "t('organization.view_detail'",
        'bg-amber-500/10',
      ]) {
        expect(source).toContain(key)
      }
    }

    for (const sourcePath of organizationMembershipSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('organization.memberships.eyebrow'",
        "t('organization.memberships.title'",
        "t('organization.memberships.active_badge'",
        "t('organization.memberships.joined_badge'",
        "t('organization.no_description'",
        "t('organization.memberships.uncategorized'",
        "t('organization.detail_dialog.project_count'",
        "t('organization.view_detail'",
        "t('organization.index.join_current'",
        "t('organization.index.join_switch'",
      ]) {
        expect(source).toContain(key)
      }
    }

    for (const sourcePath of organizationCreateSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        '\\u0111',
        "t('organization.create.name_required'",
        "t('organization.create.page_title'",
        "t('organization.create.name_label'",
        "t('organization.create.name_placeholder'",
        "t('organization.create.slug_hint'",
        "t('organization.create.description_placeholder'",
        "t('organization.create.creating'",
        "t('organization.create.submit'",
      ]) {
        expect(source).toContain(key)
      }
    }

    for (const sourcePath of [
      ...organizationDetailDialogSources,
      ...organizationCardSources,
      ...organizationListSources,
      ...organizationSwitcherSources,
      ...organizationHeaderSources,
      ...organizationAvailableSources,
      ...organizationMembershipSources,
      ...organizationCreateSources,
    ]) {
      const source = readSource(sourcePath)

      for (const forbidden of [
        'Đã tham gia',
        'Đang chờ duyệt',
        'Mô tả',
        'Chưa có mô tả',
        'Thành lập từ năm',
        'Chủ sở hữu',
        'Số nhân viên',
        'Số dự án',
        'Lĩnh vực',
        'Địa điểm',
        'Trạng thái',
        'Chưa tham gia',
        'Chuyển tổ chức',
        'Tạo tổ chức mới',
        'Tham gia tổ chức',
        'Đóng',
      ]) {
        expect(source).not.toContain(forbidden)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes organization-required dialog copy through translations', () => {
    for (const sourcePath of organizationRequiredDialogSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('organization.required_dialog.title'",
        "t('organization.required_dialog.description_line_1'",
        "t('organization.required_dialog.description_line_2'",
        "t('organization.required_dialog.view_list'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Xử lý chuyển hướng',
        'Cần có tổ chức',
        'Bạn cần tham gia hoặc tạo một tổ chức',
        'Để sử dụng đầy đủ tính năng',
        'Xem danh sách tổ chức',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }
  })
})
