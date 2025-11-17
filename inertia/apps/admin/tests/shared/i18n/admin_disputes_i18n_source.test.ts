import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

function readSource(sourcePath: string): string {
  return readFileSync(resolve(process.cwd(), sourcePath), 'utf8')
}

describe('admin disputes i18n source guard', () => {
  it('routes admin dispute list copy and dates through translations', () => {
    const source = readSource('inertia/apps/admin/modules/disputes/index.svelte')

    for (const key of [
      'useTranslation()',
      'currentDocumentLocale',
      "t('task.disputes.index.title'",
      "t('task.disputes.index.subtitle'",
      '`task.disputes.index.status.${status}`',
      '`task.disputes.index.requested_outcome.${value}`',
      '`task.disputes.index.final_decision.${value}`',
      "t('task.disputes.index.total_cases'",
      "t('task.disputes.index.open_cases'",
      "t('task.disputes.index.escalating_cases'",
      "t('task.disputes.index.filter_title'",
      "t('task.disputes.index.empty_title'",
      "t('task.disputes.index.created_at'",
      "t('task.disputes.index.reviewee'",
      "t('task.disputes.index.open_decision_room'",
      "'task.disputes.index.pagination_summary'",
    ]) {
      expect(source).toContain(key)
    }

    expect(source).not.toContain("toLocaleDateString('vi-VN')")
    expect(source).not.toContain('Danh sách khiếu nại')
    expect(source).not.toContain('Chờ xử lý')
    expect(source).not.toContain('Xóa filter')
    expect(source).not.toContain('Mở decision room')
  })

  it('routes admin dispute detail shell copy and dates through translations', () => {
    const source = readSource('inertia/apps/admin/modules/disputes/show.svelte')

    for (const key of [
      'useTranslation()',
      'currentDocumentLocale',
      "t('task.disputes.admin_detail.page_title'",
      "t('task.disputes.admin_detail.title'",
      "t('task.disputes.admin_detail.subtitle'",
      "t('task.disputes.admin_detail.processing'",
      "t('task.disputes.admin_detail.tabs.overview'",
      "t('task.disputes.admin_detail.comment_success'",
      "t('task.disputes.admin_detail.resolve_success'",
      '`task.disputes.index.source.${sourceType}`',
      'toLocaleString(documentLocale)',
    ]) {
      expect(source).toContain(key)
    }

    expect(source).not.toContain("toLocaleString('vi-VN')")
    expect(source).not.toMatch(/[À-ỹ]/)
  })

  it('routes admin AI dispute operator copy and dates through translations', () => {
    const source = readSource('inertia/apps/admin/modules/disputes/ai_operator.svelte')

    for (const key of [
      'useTranslation()',
      'currentDocumentLocale',
      'Intl.DateTimeFormat',
      'task.disputes.ai_operator.page_title',
      'task.disputes.ai_operator.title',
      'task.disputes.ai_operator.back_to_disputes',
      'task.disputes.ai_operator.queued',
      'task.disputes.ai_operator.total_ai',
      'task.disputes.ai_operator.filter_title',
      'task.disputes.ai_operator.search_placeholder',
      'task.disputes.ai_operator.provider_title',
      'task.disputes.ai_operator.queue_title',
      'task.disputes.ai_operator.runtime_package',
      'task.disputes.ai_operator.case_file_missing',
      'task.disputes.ai_operator.unknown_user',
      'task.disputes.ai_operator.open',
      'task.disputes.index.source.sprint_review_dispute',
      'task.disputes.index.status.admin_reviewing',
    ]) {
      expect(source).toContain(key)
    }

    for (const forbidden of [
      'Điều phối AI',
      'Danh sách khiếu nại',
      'Chờ xử lý',
      'Tổng lượt AI',
      'Tên task',
      'Tất cả trạng thái',
      'Chưa có AI',
      'Queue tranh chấp',
      'User không rõ',
      "toLocaleDateString('vi-VN')",
    ]) {
      expect(source).not.toContain(forbidden)
    }

    expect(source).not.toMatch(/[À-ỹ]/)
  })

  it('routes admin dispute discussion tab copy and dates through translations', () => {
    const source = readSource('inertia/apps/admin/modules/disputes/components/dispute_discussion_tab.svelte')

    for (const key of [
      'useTranslation()',
      'currentDocumentLocale',
      'Intl.DateTimeFormat',
      'task.disputes.admin_detail.discussion_tab.eyebrow',
      'task.disputes.admin_detail.discussion_tab.title',
      'task.disputes.admin_detail.discussion_tab.description',
      'task.disputes.admin_detail.discussion_tab.empty',
      'task.disputes.admin_detail.discussion_tab.comment_label',
      'task.disputes.admin_detail.discussion_tab.comment_placeholder',
      'task.disputes.admin_detail.discussion_tab.sending',
      'task.disputes.admin_detail.discussion_tab.send',
      'task.disputes.admin_detail.discussion_tab.roles.system_admin',
      'task.disputes.admin_detail.discussion_tab.roles.project_manager',
    ]) {
      expect(source).toContain(key)
    }

    for (const forbidden of [
      'Hội thoại',
      'Admin dùng luồng',
      'Chưa có hội thoại',
      'Gửi bình luận',
      'Nhập yêu cầu làm rõ',
      'Đang gửi',
      "toLocaleString('vi-VN')",
    ]) {
      expect(source).not.toContain(forbidden)
    }

    expect(source).not.toMatch(/[À-ỹ]/)
  })
})
