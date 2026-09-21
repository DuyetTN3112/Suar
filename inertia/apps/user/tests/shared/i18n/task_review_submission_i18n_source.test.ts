import { describe, expect, it } from 'vitest'

import { readSource } from './support/i18n_source_test_helpers.js'

const reviewCardSources = [
  'inertia/apps/user/modules/reviews/components/review_card.svelte',
  'inertia/apps/org/modules/reviews/components/review_card.svelte',
] as const

const taskDetailPanelSources = [
  'inertia/apps/user/modules/tasks/components/detail/task_detail_panel.svelte',
  'inertia/apps/org/modules/tasks/components/detail/task_detail_panel.svelte',
] as const

const taskReviewZoneSources = [
  'inertia/apps/user/modules/tasks/components/detail/task_review_zone_card.svelte',
  'inertia/apps/org/modules/tasks/components/detail/task_review_zone_card.svelte',
] as const

const taskSubmissionFormSources = [
  'inertia/apps/user/modules/tasks/components/detail/task_submission_form.svelte',
  'inertia/apps/org/modules/tasks/components/detail/task_submission_form.svelte',
] as const

const taskSubmissionPanelSources = [
  'inertia/apps/user/modules/tasks/components/detail/task_submission_panel.svelte',
  'inertia/apps/org/modules/tasks/components/detail/task_submission_panel.svelte',
] as const

const taskSubmissionViewSources = [
  'inertia/apps/user/modules/tasks/components/detail/task_submission_view.svelte',
  'inertia/apps/org/modules/tasks/components/detail/task_submission_view.svelte',
] as const

const taskContextCardSources = [
  'inertia/apps/user/modules/tasks/components/detail/task_context_card.svelte',
  'inertia/apps/org/modules/tasks/components/detail/task_context_card.svelte',
] as const

const taskDiscussionTabSources = [
  'inertia/apps/user/modules/tasks/components/detail/task_discussion_tab.svelte',
  'inertia/apps/org/modules/tasks/components/detail/task_discussion_tab.svelte',
] as const

describe('task review submission i18n source guard', () => {
  it('routes review card shell copy and dates through translations', () => {
    for (const sourcePath of reviewCardSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'currentDocumentLocale',
        "t('task.reviews.card.unknown_task'",
        "t('task.reviews.card.no_date'",
        "t('task.reviews.card.confirmed'",
        "t('task.reviews.card.bottleneck_title'",
        "t('task.reviews.card.reviewee'",
        "t('task.reviews.card.view_detail'",
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toContain("toLocaleDateString('vi-VN')")
      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes task detail panel shell copy and relative dates through translations', () => {
    for (const sourcePath of taskDetailPanelSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'currentDocumentLocale',
        'Intl.DateTimeFormat',
        "t('task.detail_panel.hydrating_detail'",
        "t('task.detail_panel.context_title'",
        "t('task.detail_panel.business_context'",
        "t('task.detail_panel.acceptance_criteria'",
        "t('task.detail_panel.verification_method'",
        "t('task.detail_panel.ai_dispute_info'",
        "t('task.detail_panel.task_type'",
        "t('task.detail_panel.affected_users'",
        "t('task.detail_panel.relative_overdue_days'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        "t('task.detail_panel.open_full_page'",
        "toLocaleDateString('vi-VN'",
        'Quá hạn',
        'Hôm nay',
        'Ngày mai',
        'Còn',
        'Chỉnh sửa',
        'Đang tải chi tiết đầy đủ',
        'Mô tả',
        'Không có mô tả',
        'Task cha',
        'Task con',
        'Bối cảnh',
        'Nghiệm thu',
        'Bối cảnh nghiệp vụ',
        'Tiêu chí nghiệm thu',
        'Phương thức xác minh',
        'Mục tiêu học tập',
        'Loại Task',
        'Môi trường',
        'Cộng tác',
        'Vai trò',
        'Tự chủ',
        'Vấn đề',
        'Nghiệp vụ',
        'User ảnh hưởng',
        'Ghi chú độ phức tạp',
      ]) {
        expect(source).not.toContain(forbidden)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes task review zone copy through translations and dark-safe status badges', () => {
    for (const sourcePath of taskReviewZoneSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        '`task.review_zone.review_status.${status}`',
        '`task.review_zone.dispute_status.${status}`',
        "t('task.review_zone.title'",
        "t('task.review_zone.heading_dispute'",
        "t('task.review_zone.heading_completed'",
        "t('task.review_zone.review_label'",
        "t('task.review_zone.no_session'",
        "t('task.review_zone.required_checkpoint'",
        "t('task.review_zone.open_dispute'",
        "t('task.review_zone.empty_message'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Chờ reviewer mở phiên',
        'Đang review',
        'Chờ bạn xác nhận',
        'Đang tranh chấp',
        'Đang trao đổi',
        'Đang bổ sung minh chứng',
        'Đã giải quyết',
        'Bị từ chối',
        'Đã hủy',
        'Review đã đủ dữ liệu',
        'Đang chờ review',
        'Chưa có review session',
        'Chưa có dữ liệu',
        'Checkpoint bắt buộc',
        'Còn chờ',
        'Đi tới tranh chấp',
        'Task này đã',
        'bg-amber-100',
        'text-amber-900',
        'border-amber-200',
      ]) {
        expect(source).not.toContain(forbidden)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes task submission form copy through translations', () => {
    for (const sourcePath of taskSubmissionFormSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        '`task.submission_form.evidence_type.${option.value}`',
        "t('task.submission_form.error_url_required'",
        "t('task.submission_form.error_url_scheme'",
        "t('task.submission_form.summary_label'",
        "t('task.submission_form.implementation_notes_label'",
        "t('task.submission_form.known_limitations_label'",
        "t('task.submission_form.test_notes_label'",
        "t('task.submission_form.evidence_title'",
        "t('task.submission_form.hide_form'",
        "t('task.submission_form.show_form'",
        "t('task.submission_form.add_confirm'",
        "t('task.submission_form.empty_evidence'",
        "t('task.submission_form.remove'",
        "t('task.submission_form.save_draft'",
        "t('task.submission_form.submit_package'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Vui lòng điền đường dẫn URL của bằng chứng.',
        'Đường dẫn bằng chứng phải bắt đầu bằng',
        'Tóm tắt kết quả',
        'Kết quả chính',
        'Ghi chú triển khai',
        'Mô tả kỹ thuật',
        'Hạn chế đã biết',
        'Ghi chú kiểm thử',
        'Kiểm thử đã chạy',
        'Bằng chứng kiểm chứng',
        'Ẩn biểu mẫu',
        'Thêm bằng chứng',
        'Loại bằng chứng',
        'URL bằng chứng',
        'Tiêu đề',
        'Mô tả ngắn',
        'Xác nhận thêm',
        'Chưa có bằng chứng nào',
        'Xóa',
        'Đang lưu',
        'Lưu nháp',
        'Đang nộp',
        'Nộp báo cáo',
      ]) {
        expect(source).not.toContain(forbidden)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes task submission panel copy through translations', () => {
    for (const sourcePath of taskSubmissionPanelSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'formatTaskVerificationMethodForDisplay(props.task.verification_method, t)',
        '`task.submission_panel.status.${submission.status}`',
        "t('task.submission_panel.load_error'",
        "t('task.submission_panel.summary_required'",
        "t('task.submission_panel.save_success'",
        "t('task.submission_panel.submit_success'",
        "t('task.submission_panel.lock_success'",
        "t('task.submission_panel.title'",
        "t('task.submission_panel.loading'",
        "t('task.submission_panel.acceptance_criteria'",
        "t('task.submission_panel.unset'",
        "t('task.submission_panel.verification_method'",
        "t('task.submission_panel.empty_submission'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Bản nháp',
        'Đã nộp báo cáo',
        'Báo cáo đã khóa',
        'Đã nhận xét',
        'Yêu cầu chỉnh sửa',
        'Không tải được báo cáo',
        'Vui lòng nhập tóm tắt',
        'Đã lưu bản nháp',
        'Không thể lưu bản nháp',
        'Đã khóa báo cáo',
        'Không thể khóa báo cáo',
        'Báo cáo hoàn thành công việc',
        'Đang tải thông tin nộp bài',
        'Tiêu chí nghiệm thu',
        'Chưa thiết lập',
        'Phương thức xác minh',
        'Chưa có báo cáo hoàn thành nào',
      ]) {
        expect(source).not.toContain(forbidden)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes task submission view copy and dates through translations', () => {
    for (const sourcePath of taskSubmissionViewSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'currentDocumentLocale',
        'Intl.DateTimeFormat',
        "t('task.submission_view.summary_label'",
        "t('task.submission_view.implementation_notes_label'",
        "t('task.submission_view.evidence_title'",
        "t('task.submission_view.submitted_notice'",
        "t('task.submission_view.locking'",
        "t('task.submission_view.lock_button'",
        "t('task.submission_view.locked_at'",
        '`task.submission_form.evidence_type.${evidence.evidenceType}`',
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Tóm tắt kết quả',
        'Ghi chú triển khai',
        'Bằng chứng đính kèm',
        'Báo cáo đã được gửi',
        'Đang khóa',
        'Khóa báo cáo',
        'Báo cáo đã khóa',
      ]) {
        expect(source).not.toContain(forbidden)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes task context card copy through translations and dark-safe badges', () => {
    for (const sourcePath of taskContextCardSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'formatTaskVerificationMethodForDisplay(task.verification_method, t)',
        "t('task.context_card.title'",
        "t('task.context_card.context_background'",
        "t('task.context_card.acceptance'",
        "t('task.context_card.verification'",
        "t('task.context_card.tech_stack'",
        "t('task.context_card.domain'",
        "t('task.context_card.more_info'",
        "t('task.context_card.task_type'",
        "t('task.context_card.environment'",
        "t('task.context_card.collaboration'",
        "t('task.context_card.role'",
        "t('task.context_card.autonomy'",
        "t('task.context_card.problem'",
        "t('task.context_card.business_domain'",
        "t('task.context_card.affected_users'",
        "t('task.context_card.notes'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Ngữ cảnh',
        'Bối cảnh',
        'Nghiệm thu',
        'Xác minh',
        'Mục tiêu học tập',
        'Thông tin thêm',
        'Loại task',
        'Môi trường',
        'Cộng tác',
        'Vai trò',
        'Tự chủ',
        'Vấn đề',
        'Nghiệp vụ',
        'User ảnh hưởng',
        'Ghi chú',
        'border-indigo-200',
        'bg-indigo-50',
        'text-indigo-700',
      ]) {
        expect(source).not.toContain(forbidden)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes task discussion tab copy through translations and dark-safe reply banner', () => {
    for (const sourcePath of taskDiscussionTabSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('task.discussion_tab.load_error'",
        "t('task.discussion_tab.create_error'",
        "t('task.discussion_tab.delete_error'",
        "t('task.discussion_tab.update_error'",
        "t('task.discussion_tab.title'",
        "t('task.discussion_tab.loading'",
        "t('task.discussion_tab.empty'",
        "t('task.discussion_tab.edited'",
        "t('task.discussion_tab.reply'",
        "t('task.discussion_tab.cancel'",
        "t('task.discussion_tab.saving'",
        "t('task.discussion_tab.save'",
        "t('task.discussion_tab.replying_to'",
        "t('task.discussion_tab.cancel_reply'",
        "t('task.discussion_tab.placeholder'",
        "t('task.discussion_tab.sending'",
        "t('task.discussion_tab.send'",
        '`task.discussion_tab.comment_type.${comment.commentType}`',
        '`task.discussion_tab.visibility.${comment.visibility}`',
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Không tải được thảo luận',
        'Không gửi được bình luận',
        'Không xóa được bình luận',
        'Không cập nhật được bình luận',
        'Thảo luận công việc',
        'Đang tải thảo luận',
        'Chưa có bình luận nào',
        'đã sửa',
        'Hủy',
        'Đang lưu',
        'Lưu',
        'Đang trả lời',
        'Hủy reply',
        'Ghi chú tiến độ',
        'Đang gửi',
        'Gửi bình luận',
        'border-amber-200',
        'bg-amber-50',
      ]) {
        expect(source).not.toContain(forbidden)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })
})
