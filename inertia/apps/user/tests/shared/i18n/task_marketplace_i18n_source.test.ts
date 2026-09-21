import { describe, expect, it } from 'vitest'

import { readSource } from './support/i18n_source_test_helpers.js'

const marketplaceCardSources = [
  'inertia/apps/user/modules/marketplace/components/marketplace_task_card.svelte',
  'inertia/apps/org/modules/marketplace/components/marketplace_task_card.svelte',
] as const

const marketplacePageSources = [
  'inertia/apps/user/modules/marketplace/tasks.svelte',
  'inertia/apps/org/modules/marketplace/tasks.svelte',
] as const

const marketplaceFilterSources = [
  'inertia/apps/user/modules/marketplace/components/marketplace_filters.svelte',
  'inertia/apps/org/modules/marketplace/components/marketplace_filters.svelte',
] as const

const applyTaskModalSources = [
  'inertia/apps/user/modules/marketplace/components/apply_task_modal.svelte',
  'inertia/apps/org/modules/marketplace/components/apply_task_modal.svelte',
] as const

const sprintReverseBoardSources = [
  'inertia/apps/user/modules/reviews/sprint-reverse-board.svelte',
] as const

describe('task marketplace i18n source guard', () => {
  it('routes marketplace task card copy and dates through translations', () => {
    for (const sourcePath of marketplaceCardSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'currentDocumentLocale',
        "t('task.marketplace_card.unknown_organization'",
        "t('task.marketplace_card.no_project'",
        "t('task.marketplace_card.unknown_owner'",
        "t('task.marketplace_card.unnamed_skill'",
        "t('task.marketplace_card.range_missing'",
        "t('task.marketplace_card.task_type'",
        "t('task.marketplace_card.acceptance'",
        "t('task.marketplace_card.application.pending'",
        "t('task.marketplace_card.can_apply'",
        "t('task.marketplace_card.deadline'",
        "t('task.marketplace_card.required_skills'",
        "t('task.marketplace_card.profile_recommendation'",
        "t('task.marketplace_card.needs_verification'",
        "t('task.marketplace_card.view_task_profile'",
        "t('task.marketplace_card.withdraw_application'",
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toContain("toLocaleDateString('vi-VN'")
      expect(source).not.toContain("toLocaleString('vi-VN'")
      expect(source).not.toContain('labelVi')
      expect(source).not.toContain('Tổ chức không xác định')
      expect(source).not.toContain('Gửi đề xuất')
      expect(source).not.toContain('Đang rút đề xuất')
    }
  })

  it('routes marketplace task page copy through translations', () => {
    for (const sourcePath of marketplacePageSources) {
      const source = readSource(sourcePath)

      for (const key of [
        "t('task.marketplace_page.title'",
        "t('task.marketplace_page.user_eyebrow'",
        "t('task.marketplace_page.total_label'",
        "t('task.marketplace_page.showing_range'",
        "t('task.marketplace_page.empty_title'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Thị trường task',
        'Không gian tổ chức / Thị trường task',
        'Người dùng / Thị trường task',
        'Hiển thị',
        'Không tìm thấy nhiệm vụ nào',
        'Thử bộ lọc khác.',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }
  })

  it('routes marketplace filter copy through translations', () => {
    for (const sourcePath of marketplaceFilterSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'task.marketplace_filters.keyword_label',
        'task.marketplace_filters.skill_categories',
        'task.marketplace_filters.all_skills',
        'task.marketplace_filters.toggle_more',
        'task.marketplace_filters.difficulty.${value}',
        'task.marketplace_filters.accepting_applications.open',
        'task.marketplace_filters.sort.desc',
        'task.marketplace_filters.clear_filters',
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'labelVi',
        'Tìm nhiệm vụ',
        'Tên task, mô tả',
        'Nhóm kỹ năng',
        'Công nghệ',
        'Kỹ thuật phần mềm',
        'Kỹ năng mềm',
        'Quản lý công việc',
        'Tất cả kỹ năng',
        'Ẩn lọc',
        'Lọc thêm',
        'Độ khó',
        'Nghiệm thu',
        'Nhận đề xuất',
        'Đang nhận',
        'Đã hết hạn',
        'Nghiệp vụ',
        'Loại vấn đề',
        'Sắp xếp',
        'Giảm dần',
        'Tăng dần',
        'Xóa lọc',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }
  })

  it('routes apply task modal copy and toast through translations', () => {
    for (const sourcePath of applyTaskModalSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('task.apply_modal.empty_proposal'",
        "t('task.apply_modal.invalid_link'",
        "t('task.apply_modal.submit_error'",
        "t('task.apply_modal.success_title'",
        "t('task.apply_modal.success_description'",
        "t('task.apply_modal.csrf_expired'",
        "t('task.apply_modal.network_error'",
        "t('task.apply_modal.title'",
        "t('task.apply_modal.message_label'",
        "t('task.apply_modal.message_placeholder'",
        "t('task.apply_modal.portfolio_label'",
        "t('task.apply_modal.cancel'",
        "t('task.apply_modal.submitting'",
        "t('task.apply_modal.submit'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Hãy thêm lời nhắn',
        'Liên kết portfolio phải',
        'Không thể gửi đề xuất tham gia',
        'Đã gửi đề xuất tham gia',
        'Người phụ trách task',
        'Phiên bảo mật đã hết hạn',
        'Đã xảy ra lỗi mạng',
        'Gửi đề xuất tham gia task',
        'Lời nhắn',
        'Giới thiệu bản thân',
        'mỗi dòng',
        'Hủy',
        'Đang gửi',
      ]) {
        expect(source).not.toContain(forbidden)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes sprint reverse review board copy through translations and dark-safe status tones', () => {
    for (const sourcePath of sprintReverseBoardSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'task.sprint_reverse_board.title.environment',
        'task.sprint_reverse_board.environment_context',
        'task.sprint_reverse_board.eyebrow',
        'task.sprint_reverse_board.sprint_label',
        'task.sprint_reverse_board.kanban_aria',
        'task.sprint_reverse_board.empty_lane',
        'task.sprint_reverse_board.status_label',
        'task.sprint_reverse_board.rating_label',
        'task.sprint_reverse_board.review_placeholder',
        'task.sprint_reverse_board.submit_review',
        'task.sprint_reverse_board.accept',
        'task.sprint_reverse_board.response_placeholder',
        'task.sprint_reverse_board.respond',
        'task.sprint_reverse_board.report_placeholder',
        'task.sprint_reverse_board.submit_report',
        'task.sprint_reverse_board.related_task_count',
        'task.sprint_reverse_board.related_tasks_count',
        'task.sprint_reverse_board.read_only_hint',
        'task.sprint_reverse_board.read_only_status',
        'task.sprint_reverse_board.responder_required',
        'task.sprint_reverse_board.unassigned',
        'task.sprint_reverse_board.workflow_done',
        'task.sprint_reverse_board.workflow_reported',
        '`task.sprint_reverse_board.status.${status}`',
        'bg-primary/10',
        'bg-destructive',
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Review môi trường làm việc',
        'Môi trường làm việc',
        'tổ chức',
        'đồng nghiệp',
        'Người giao việc',
        'Quản lý ',
        'Kanban trạng thái',
        'Trống',
        'Trạng thái:',
        'Điểm',
        'Nhập review',
        'Gửi review',
        'Đồng ý',
        'Phản hồi',
        'Lý do report admin',
        'Gửi report',
        'task trong sprint',
        'chỉ xem',
        'Responder bắt buộc',
        'Chưa gán',
        'Workflow đã',
        'bg-blue-50',
        'bg-zinc-100',
        'text-zinc-800',
        'bg-emerald-600',
        'text-white',
      ]) {
        expect(source).not.toContain(forbidden)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })
})
