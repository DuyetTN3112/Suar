import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const profileSnapshotSources = [
  'inertia/apps/user/modules/profile/components/profile_snapshot_panel.svelte',
  'inertia/apps/org/modules/profile/components/profile_snapshot_panel.svelte',
] as const

const profileReviewSources = [
  'inertia/apps/user/modules/profile/components/profile_featured_reviews_section.svelte',
] as const

const profileOverviewSources = [
  'inertia/apps/user/modules/profile/components/profile_overview_section.svelte',
  'inertia/apps/org/modules/profile/components/profile_overview_section.svelte',
] as const

const profileSkillsSources = [
  'inertia/apps/user/modules/profile/components/profile_skills_and_charts_section.svelte',
  'inertia/apps/org/modules/profile/components/profile_skills_and_charts_section.svelte',
] as const

const profileEditSources = [
  'inertia/apps/user/modules/profile/edit.svelte',
  'inertia/apps/org/modules/profile/edit.svelte',
] as const

const profileInvitationSources = [
  'inertia/apps/user/modules/profile/invitations.svelte',
  'inertia/apps/org/modules/profile/invitations.svelte',
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

function profileSubtree(localePath: string): Record<string, unknown> {
  const user = readJson(localePath).user
  if (typeof user !== 'object' || user === null || Array.isArray(user)) {
    throw new Error(`${localePath} missing user resource object`)
  }

  return {
    invitations: (user as Record<string, unknown>).invitations,
    profile_overview: (user as Record<string, unknown>).profile_overview,
    profile_skills: (user as Record<string, unknown>).profile_skills,
    profile_snapshot: (user as Record<string, unknown>).profile_snapshot,
    profile_reviews: (user as Record<string, unknown>).profile_reviews,
  }
}

describe('profile i18n source guard', () => {
  it('keeps English and Vietnamese profile resources in sync', () => {
    expect(flattenKeys(profileSubtree('resources/lang/en/user.json')).sort()).toEqual(
      flattenKeys(profileSubtree('resources/lang/vi/user.json')).sort()
    )
  })

  it('routes profile snapshot panels through translations and locale-aware dates', () => {
    for (const sourcePath of profileSnapshotSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'currentDocumentLocale',
        'Intl.DateTimeFormat',
        'user.profile_snapshot.date_unavailable',
        'user.profile_snapshot.history_load_error',
        'user.profile_snapshot.publish_success',
        'user.profile_snapshot.access_public_success',
        'user.profile_snapshot.rotate_link_success',
        'user.profile_snapshot.copy_link_success',
        'user.profile_snapshot.title',
        'user.profile_snapshot.name_label',
        'user.profile_snapshot.share_label',
        'user.profile_snapshot.current_title',
        'user.profile_snapshot.version_label',
        'user.profile_snapshot.access_label',
        'user.profile_snapshot.history_title',
        'user.profile_snapshot.history_count',
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Đóng gói hồ sơ hiện tại',
        'Tên snapshot',
        'Chia sẻ',
        'Công khai',
        'Riêng tư',
        'Đang tạo...',
        'Tải lịch sử',
        'Snapshot hiện tại',
        'Phiên bản:',
        'Bộ chấm điểm:',
        'Quyền chia sẻ',
        'Link chia sẻ',
        'Lịch sử snapshot',
        'Chưa có snapshot',
        'bg-white',
        'color-mix(in_srgb,var(--color-black)_2%,white)',
        ".toLocaleString('vi-VN')",
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }
  })

  it('routes profile review history through translations and dark-safe surfaces', () => {
    for (const sourcePath of profileReviewSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'currentDocumentLocale',
        'Intl.DateTimeFormat',
        '`user.profile_reviews.kind.${kind}`',
        '`user.profile_reviews.status.${status}`',
        'user.profile_reviews.date_unavailable',
        'user.profile_reviews.eyebrow',
        'user.profile_reviews.title',
        'user.profile_reviews.reviewed_count',
        'user.profile_reviews.view_all',
        'user.profile_reviews.received_title',
        'user.profile_reviews.sent_title',
        'user.profile_reviews.filter_all',
        'user.profile_reviews.lane_count',
        'user.profile_reviews.sort_label',
        'user.profile_reviews.empty_received',
        'user.profile_reviews.direction_received',
        'user.profile_reviews.details',
        'user.profile_reviews.empty_featured_title',
        'user.profile_reviews.review_count',
        'user.profile_reviews.stars_aria',
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Đánh giá hai chiều',
        'kỹ năng đã được đánh giá',
        'Xem toàn bộ',
        'Sao</button>',
        'Tất cả',
        'Người giao việc',
        'Môi trường',
        'Sắp xếp',
        'Mới nhất',
        'Điểm cao',
        'Chưa có review',
        'Nhận được',
        'Đã viết',
        'Chi tiết',
        'Chưa có đánh giá nổi bật',
        'đánh giá',
        'bg-white',
        ".toLocaleDateString('vi-VN')",
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }
  })

  it('routes profile overview shell copy through translations', () => {
    for (const sourcePath of profileOverviewSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'user.profile_overview.member',
        'user.profile_overview.headline_fallback',
        'user.profile_overview.capability_verified',
        'user.profile_overview.profile_trust',
        'user.profile_overview.delivery_reliability',
        'user.profile_overview.evidence_coverage',
        'user.profile_overview.review_credibility',
        'user.profile_overview.no_task_data',
        'user.profile_overview.no_skill_data',
        'user.profile_overview.disputed_skill_count',
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Thành viên',
        'Hồ sơ năng lực',
        'đang neo capability',
        'phản hồi',
        'nhiệm vụ đúng hạn',
        'trễ',
        'Phân loại nhiệm vụ',
        'Đúng hạn',
        'Đang làm',
        'Trễ',
        'Chưa có dữ liệu nhiệm vụ.',
        'Độ sâu kỹ năng',
        'Tổng:',
        'Chưa có kỹ năng được khai báo.',
        'skill tranh chấp',
      ]) {
        expect(source).not.toContain(forbidden)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes profile skill atlas copy through translations and locale-aware dates', () => {
    for (const sourcePath of profileSkillsSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'currentDocumentLocale',
        'Intl.DateTimeFormat',
        'user.profile_skills.score_unreviewed',
        'user.profile_skills.evidence_sources',
        '`user.profile_skills.confidence.${value}`',
        'user.profile_skills.confidence_label',
        '`user.profile_skills.freshness.${value}`',
        '`user.profile_skills.governance.${value}`',
        'user.profile_skills.eyebrow',
        'user.profile_skills.title',
        'user.profile_skills.total_skills',
        'user.profile_skills.reviewed_skills',
        'user.profile_skills.imported_claim',
        'user.profile_skills.imported_claims',
        'user.profile_skills.disputed_skills',
        'user.profile_skills.inventory_eyebrow',
        'user.profile_skills.inventory_title',
        'user.profile_skills.inventory_description',
        'user.profile_skills.group_skill_count',
        'user.profile_skills.group_reviewed_count',
        'user.profile_skills.group_empty',
        'user.profile_skills.review_count',
        'user.profile_skills.source_reviewed',
        'user.profile_skills.source_imported',
        'user.profile_skills.score_label',
        'user.profile_skills.signal_label',
        'user.profile_skills.signal_verified',
        'user.profile_skills.signal_imported',
        'user.profile_skills.evidence_signal',
        'user.profile_skills.last_reviewed',
        'user.profile_skills.source_label',
        'user.profile_skills.no_evidence_snapshot',
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Bản đồ năng lực',
        'kỹ năng',
        'kỹ năng reviewed',
        'tranh chấp',
        'Toàn bộ kỹ năng',
        'nguồn dữ liệu',
        'Chưa có kỹ năng',
        'Lần review cuối',
        'Nguồn:',
        'Chưa có evidence snapshot',
        ".toLocaleDateString('vi-VN')",
      ]) {
        expect(source).not.toContain(forbidden)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes profile edit copy through translations and dark-safe alert surfaces', () => {
    for (const sourcePath of profileEditSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'settings.profile_title',
        'settings.personal_information_title',
        'settings.field_locked',
        'settings.phone',
        'settings.phone_placeholder',
        'settings.timezone',
        'settings.timezone_placeholder',
        'settings.address',
        'settings.address_placeholder',
        'settings.bio',
        'settings.bio_placeholder',
        'settings.saving',
        'settings.update_personal_info',
        'settings.profile_skills_title',
        'settings.add_skill',
        'settings.remove_skill_title',
        'settings.remove_skill_description',
        'common.cancel',
        'common.delete',
        'bg-emerald-500/10',
        'bg-destructive/10',
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Chỉnh sửa hồ sơ',
        'Thông tin cá nhân',
        'Không thể thay đổi',
        'Số điện thoại',
        'Nhập số điện thoại',
        'Múi giờ',
        'Địa chỉ',
        'Giới thiệu bản thân',
        'Đang lưu',
        'Lưu thông tin',
        'Quản lý kỹ năng',
        'Thêm kỹ năng',
        'Xóa kỹ năng',
        'Bạn có chắc',
        'bg-ink-04',
        'bg-orange-03',
      ]) {
        expect(source).not.toContain(forbidden)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes profile invitation copy through translations and locale-aware dates', () => {
    for (const sourcePath of profileInvitationSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'dateFnsLocale',
        'dateTimePattern(locale)',
        'user.invitations.title',
        'user.invitations.description',
        'user.invitations.empty_title',
        'user.invitations.empty_description',
        'user.invitations.organization_anonymous',
        'user.invitations.role_label',
        'user.invitations.invited_by',
        'user.invitations.anonymous_inviter',
        'user.invitations.sent_at',
        'user.invitations.accept',
        'user.invitations.reject',
        'user.invitations.accept_success',
        'user.invitations.reject_success',
        'user.invitations.action_error',
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Lời mời tham gia tổ chức',
        'Danh sách các lời mời',
        'Chưa có lời mời nào',
        'Tổ chức ẩn danh',
        'Vai trò:',
        'Được mời bởi',
        'Người mời ẩn danh',
        'Gửi vào',
        'Đồng ý',
        'Từ chối',
        'Có lỗi xảy ra',
        'Đã từ chối',
      ]) {
        expect(source).not.toContain(forbidden)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })
})
