import { describe, expect, it } from 'vitest'

import { readSource } from './support/i18n_source_test_helpers.js'

const projectSkillsTabSources = [
  [
    'inertia/apps/user/modules/projects/components/project_skills_tab.svelte',
    'inertia/apps/user/modules/projects/components/project_skill_add_dialog.svelte',
    'inertia/apps/user/modules/projects/components/project_skill_edit_dialog.svelte',
  ],
  [
    'inertia/apps/org/modules/projects/components/project_skills_tab.svelte',
    'inertia/apps/org/modules/projects/components/project_skill_add_dialog.svelte',
    'inertia/apps/org/modules/projects/components/project_skill_edit_dialog.svelte',
  ],
] as const

const projectStaffingHelperSources = [
  'inertia/apps/user/modules/projects/components/project_member_setup_preview.svelte',
  'inertia/apps/org/modules/projects/components/project_member_setup_preview.svelte',
  'inertia/apps/user/modules/projects/components/project_staffing_auto_fill_preview_item.svelte',
  'inertia/apps/org/modules/projects/components/project_staffing_auto_fill_preview_item.svelte',
  'inertia/apps/user/modules/projects/components/project_staffing_explainability_summary.svelte',
  'inertia/apps/org/modules/projects/components/project_staffing_explainability_summary.svelte',
] as const

const projectStaffingPanelSources = [
  'inertia/apps/user/modules/projects/components/project_staffing_panel.svelte',
  'inertia/apps/org/modules/projects/components/project_staffing_panel.svelte',
] as const

const projectStaffingResultSources = [
  'inertia/apps/user/modules/projects/components/project_staffing_auto_fill_result_item.svelte',
  'inertia/apps/org/modules/projects/components/project_staffing_auto_fill_result_item.svelte',
] as const

const projectRoleAddDialogSources = [
  'inertia/apps/user/modules/projects/components/project_role_add_dialog.svelte',
  'inertia/apps/org/modules/projects/components/project_role_add_dialog.svelte',
] as const

const projectRoleCandidatesDialogSources = [
  'inertia/apps/user/modules/projects/components/project_role_candidates_dialog.svelte',
  'inertia/apps/org/modules/projects/components/project_role_candidates_dialog.svelte',
] as const

describe('project staffing i18n source guard', () => {
  it('routes project skills tab copy through translations and dark-safe tokens', () => {
    for (const sourcePaths of projectSkillsTabSources) {
      const source = sourcePaths.map((p) => readSource(p)).join('\n')

      for (const key of [
        'useTranslation()',
        "t('project.skills_tab.load_error'",
        "t('project.skills_tab.add_success'",
        "t('project.skills_tab.add_error'",
        "t('project.skills_tab.save_success'",
        "t('project.skills_tab.save_error'",
        "t('project.skills_tab.deactivate_title'",
        "'project.skills_tab.deactivate_desc'",
        "t('project.skills_tab.deactivate_confirm'",
        "t('project.skills_tab.deactivate_success'",
        "t('project.skills_tab.deactivate_error'",
        '`project.skills_tab.category.${category}`',
        '`project.skills_tab.status_filter.${status}`',
        "t('project.skills_tab.search_placeholder'",
        "t('project.skills_tab.add_skill'",
        "t('project.skills_tab.add_title'",
        "t('project.skills_tab.select_skill'",
        "t('project.skills_tab.select_skill_placeholder'",
        "t('project.skills_tab.all_skills_added'",
        "t('project.skills_tab.loading'",
        "t('project.skills_tab.empty_filtered'",
        "t('project.skills_tab.empty'",
        "t('project.skills_tab.header_custom_name'",
        "t('project.skills_tab.status.active'",
        "t('project.skills_tab.configure'",
        "t('project.skills_tab.counter'",
        "t('project.skills_tab.edit_title'",
        "t('project.skills_tab.display_name_label'",
        "t('project.skills_tab.description_placeholder'",
        "t('project.skills_tab.save_settings'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Tìm skill...',
        'Đang active',
        'Đã tắt',
        'Thêm Skill',
        'Thêm Skill vào Catalog',
        'Chọn Skill',
        'Đang tải...',
        'Không có skill nào khớp bộ lọc',
        'Chưa có skill.',
        'Tên tùy chỉnh',
        'Cấu hình',
        'Lưu cấu hình',
      ]) {
        expect(source).not.toContain(forbidden)
      }

      for (const forbiddenPattern of [
        /\bbg-slate-50\b/,
        /\btext-slate-800\b/,
        /\btext-slate-600\b/,
        /\bborder-slate-200\b/,
        /\bbg-cyan-50\b/,
        /\bbg-violet-50\b/,
        /\bbg-blue-50\b/,
        /\bbg-amber-50\b/,
      ]) {
        expect(source).not.toMatch(forbiddenPattern)
      }
    }
  })

  it('routes project staffing helper copy through translations', () => {
    for (const sourcePath of projectStaffingHelperSources) {
      const source = readSource(sourcePath)

      expect(source).toContain('useTranslation()')
      expect(source).toContain('project.staffing.')

      for (const forbidden of [
        'Xem trước',
        'Thành viên',
        'Quyền',
        'Chưa gán role',
        'Bật lại',
        'Bỏ khỏi batch',
        'Cập nhật',
        'Thêm',
        'Chưa có ứng viên.',
        'Đã bỏ khỏi batch.',
        'đã review',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }

    for (const sourcePath of [
      'inertia/apps/user/modules/projects/components/project_member_setup_preview.svelte',
      'inertia/apps/org/modules/projects/components/project_member_setup_preview.svelte',
    ]) {
      const source = readSource(sourcePath)

      for (const key of [
        "t('project.staffing.preview_title'",
        "t('project.staffing.member_label'",
        "t('project.staffing.permission_label'",
        "t('project.staffing.role_label'",
        "t('project.staffing.unassigned_role'",
      ]) {
        expect(source).toContain(key)
      }
    }

    for (const sourcePath of [
      'inertia/apps/user/modules/projects/components/project_staffing_auto_fill_preview_item.svelte',
      'inertia/apps/org/modules/projects/components/project_staffing_auto_fill_preview_item.svelte',
    ]) {
      const source = readSource(sourcePath)

      for (const key of [
        "t('project.staffing.restore_to_batch'",
        "t('project.staffing.exclude_from_batch'",
        "t('project.staffing.action_update'",
        "t('project.staffing.action_add'",
        "t('project.staffing.no_candidate'",
        "t('project.staffing.excluded_from_batch'",
      ]) {
        expect(source).toContain(key)
      }
    }

    for (const sourcePath of [
      'inertia/apps/user/modules/projects/components/project_staffing_explainability_summary.svelte',
      'inertia/apps/org/modules/projects/components/project_staffing_explainability_summary.svelte',
    ]) {
      const source = readSource(sourcePath)

      for (const key of [
        "t('project.staffing.reviewed_summary'",
        "t('project.staffing.imported_summary'",
        "t('project.staffing.dispute_summary'",
      ]) {
        expect(source).toContain(key)
      }
    }
  })

  it('routes project staffing panel and result copy through translations', () => {
    for (const sourcePath of projectStaffingPanelSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('project.staffing.title'",
        "t('project.staffing.loading_candidates'",
        "t('project.staffing.no_candidate_match'",
        "t('project.staffing.auto_fill_preview'",
        "t('project.staffing.add_member_summary'",
        "t('project.staffing.update_member_summary'",
        "t('project.staffing.skipped_summary'",
        "t('project.staffing.excluded_summary'",
        "t('project.staffing.include_all'",
        "t('project.staffing.exclude_all'",
        "t('project.staffing.auto_fill_preparing'",
        "t('project.staffing.review_each_role'",
        "t('project.staffing.confirm_auto_fill'",
        "t('project.staffing.apply_auto_fill'",
        "t('project.staffing.cancel_batch'",
        "t('project.staffing.last_batch_results'",
        "t('project.staffing.total_candidates'",
        "t('project.staffing.org_member_candidates'",
        "t('project.staffing.project_member_candidates'",
        "t('project.staffing.candidate_list'",
        "t('project.staffing.assigning'",
        "t('project.staffing.assign'",
        "t('project.staffing.open_role'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Đang tải ứng viên...',
        'Chưa có candidate phù hợp.',
        'Xem trước auto-fill',
        'thêm mới',
        'gán lại',
        'skip vì chưa có match an toàn',
        'đang loại khỏi batch',
        'Chọn lại toàn bộ',
        'Bỏ chọn toàn bộ',
        'Đang auto-fill...',
        'Chuẩn bị auto-fill',
        'Rà từng role',
        'Xác nhận auto-fill',
        'Đang áp dụng...',
        'Xác nhận & áp dụng',
        'Hủy batch',
        'Kết quả batch gần nhất',
        'ứng viên',
        'ngoài project',
        'trong project',
        'Danh sách',
        'Đang xử lý...',
        'Gán',
        'Mở role',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }

    for (const sourcePath of projectStaffingResultSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('project.staffing.result_update'",
        "t('project.staffing.result_add'",
        "t('project.staffing.result_error'",
        "t('project.staffing.selected_candidate'",
        "t('project.staffing.retry'",
        "t('project.staffing.choose_manually'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        ' gán lại ',
        ' thêm mới ',
        'lỗi khi áp dụng cho',
        'candidate đã chọn',
        'Thử lại',
        'Chọn tay',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }
  })

  it('routes project role dialog copy through translations', () => {
    for (const sourcePath of projectRoleAddDialogSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('project.role_dialog.create_success'",
        "t('project.role_dialog.create_error'",
        "t('project.role_dialog.title'",
        "t('project.role_dialog.clone_template'",
        "t('project.role_dialog.custom_blank'",
        "t('project.role_dialog.template_label'",
        "t('project.role_dialog.template_placeholder'",
        "t('project.role_dialog.code_label'",
        "t('project.role_dialog.name_label'",
        "t('project.role_dialog.description_label'",
        "t('project.role_dialog.description_placeholder'",
        "t('project.role_dialog.cancel'",
        "t('project.role_dialog.submit'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Đã tạo role',
        'Lỗi tạo role',
        'Thêm role',
        'Clone từ Template',
        'Chọn Template',
        'Chọn template',
        'Mã Role',
        'Tên hiển thị',
        'Mô tả (tùy chọn)',
        'Mô tả vai trò',
        'Hủy',
        'Tạo Role',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }

    for (const sourcePath of projectRoleCandidatesDialogSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('project.role_candidates.load_error'",
        "t('project.role_candidates.assign_success'",
        "t('project.role_candidates.add_success'",
        "t('project.role_candidates.add_error'",
        "t('project.role_candidates.title'",
        "t('project.role_candidates.loading'",
        "t('project.role_candidates.empty'",
        "t('project.role_candidates.missing_skills'",
        "t('project.role_candidates.assign_role'",
        "t('project.role_candidates.choose_and_add'",
        "t('project.role_candidates.close'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Không thể tải danh sách ứng viên đề xuất',
        'Đã gán',
        'Đã thêm',
        'Lỗi thêm ứng viên',
        'Ứng viên phù hợp cho vai trò',
        'Đang tải ứng viên...',
        'Chưa có ứng viên phù hợp.',
        'Còn thiếu',
        'Gán role này',
        'Chọn & Thêm',
        'Đóng',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }
  })
})
