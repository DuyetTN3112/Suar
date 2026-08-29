import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

function readSource(sourcePath: string): string {
  return readFileSync(resolve(process.cwd(), sourcePath), 'utf8')
}

describe('admin disputes i18n source guard', () => {
  it('routes System Admin dispute board copy and dates through translations', () => {
    const source = readSource('inertia/apps/admin/modules/disputes/index.svelte')

    for (const key of [
      'useTranslation()',
      'currentDocumentLocale',
      'Intl.DateTimeFormat',
      "t('task.disputes.index.page_title'",
      "t('task.disputes.index.eyebrow'",
      "t('task.disputes.index.ai_board_title'",
      "'task.disputes.index.ai_board_subtitle'",
      '`task.disputes.index.status.${status}`',
      "t('task.disputes.index.total_cases'",
      "t('task.disputes.index.ai_active'",
      "t('task.disputes.index.decision_ready'",
      "t('task.disputes.index.empty_lane'",
      "'task.disputes.index.board_window'",
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
      "t('task.disputes.admin_detail.page_title'",
      "t('task.disputes.admin_detail.title'",
      "t('task.disputes.admin_detail.processing'",
      "t('task.disputes.admin_detail.tabs.overview'",
      "t('task.disputes.admin_detail.comment_success'",
      "t('task.disputes.admin_detail.resolve_success'",
      '`task.disputes.index.source.${sourceType}`',
      "'task.disputes.admin_detail.ai_acceptance_rationale'",
    ]) {
      expect(source).toContain(key)
    }

    expect(source).not.toContain("toLocaleString('vi-VN')")
    expect(source).not.toMatch(/[À-ỹ]/)
  })

  it('routes admin dispute discussion tab copy and dates through translations', () => {
    const source = readSource(
      'inertia/apps/admin/modules/disputes/components/dispute_discussion_tab.svelte'
    )

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
