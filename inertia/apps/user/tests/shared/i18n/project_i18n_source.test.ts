import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const projectIndexSources = [
  'inertia/apps/user/modules/projects/index.svelte',
  'inertia/apps/org/modules/projects/index.svelte',
] as const

const projectFoundationSources = [
  'inertia/apps/user/modules/projects/components/project_create_foundation_step.svelte',
  'inertia/apps/org/modules/projects/components/project_create_foundation_step.svelte',
] as const

const projectCreatePageSources = [
  'inertia/apps/user/modules/projects/create.svelte',
  'inertia/apps/org/modules/projects/create.svelte',
] as const

const projectCreateStaffingSources = [
  'inertia/apps/user/modules/projects/components/project_create_staffing_step.svelte',
  'inertia/apps/org/modules/projects/components/project_create_staffing_step.svelte',
] as const

const projectCreateLaunchSources = [
  'inertia/apps/user/modules/projects/components/project_create_launch_step.svelte',
  'inertia/apps/org/modules/projects/components/project_create_launch_step.svelte',
] as const

const projectSprintPanelSources = [
  'inertia/apps/user/modules/projects/components/project_sprint_panel.svelte',
  'inertia/apps/org/modules/projects/components/project_sprint_panel.svelte',
] as const

const projectSkillsTabSources = [
  'inertia/apps/user/modules/projects/components/project_skills_tab.svelte',
  'inertia/apps/org/modules/projects/components/project_skills_tab.svelte',
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

const projectDetailsTabSources = [
  'inertia/apps/user/modules/projects/components/project_details_tab.svelte',
  'inertia/apps/org/modules/projects/components/project_details_tab.svelte',
] as const

const projectMembersTabSources = [
  'inertia/apps/user/modules/projects/components/project_members_tab.svelte',
  'inertia/apps/org/modules/projects/components/project_members_tab.svelte',
] as const

const projectMemberCardSources = [
  'inertia/apps/user/modules/projects/components/project_member_card.svelte',
  'inertia/apps/org/modules/projects/components/project_member_card.svelte',
] as const

const projectRolesTabSources = [
  'inertia/apps/user/modules/projects/components/project_roles_tab.svelte',
  'inertia/apps/org/modules/projects/components/project_roles_tab.svelte',
] as const

const projectRoleSkillDialogSources = [
  'inertia/apps/user/modules/projects/components/project_role_skill_dialog.svelte',
  'inertia/apps/org/modules/projects/components/project_role_skill_dialog.svelte',
] as const

const projectDetailModalSources = [
  'inertia/apps/user/modules/projects/components/project_detail_modal.svelte',
  'inertia/apps/org/modules/projects/components/project_detail_modal.svelte',
] as const

const projectShowSources = [
  'inertia/apps/user/modules/projects/show.svelte',
  'inertia/apps/org/modules/projects/show.svelte',
] as const

const projectOperatingModelSources = [
  'inertia/apps/org/modules/projects/components/project_operating_model_tab.svelte',
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

describe('project i18n source guard', () => {
  it('keeps English and Vietnamese project resources in sync', () => {
    expect(flattenKeys(readJson('resources/lang/en/project.json')).sort()).toEqual(
      flattenKeys(readJson('resources/lang/vi/project.json')).sort()
    )
  })

  it('routes project index labels through translations', () => {
    for (const sourcePath of projectIndexSources) {
      const source = readSource(sourcePath)

      for (const key of [
        "t('project.projects'",
        "t('project.total_projects'",
        "t('project.active_projects'",
        "t('project.unique_managers'",
        "t('project.completed_projects'",
        "t('project.clear_filters'",
        "t('project.project_list'",
        "t('project.no_projects'",
        "t('project.visibility'",
        "t('project.visibility_public'",
        "t('project.visibility_private'",
        "t('project.visibility_team'",
        "t('project.status_unknown'",
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toContain('Phạm vi</TableHead>')
      expect(source).not.toMatch(/[À-ỹ]/)
    }

    const orgSource = readSource('inertia/apps/org/modules/projects/index.svelte')
    for (const key of [
      "t('project.no_manager'",
      "t('project.view_project_detail'",
      "t('project.open_project_tasks'",
    ]) {
      expect(orgSource).toContain(key)
    }
  })

  it('routes project foundation form labels through translations', () => {
    for (const sourcePath of projectFoundationSources) {
      const source = readSource(sourcePath)

      for (const key of [
        "t('project.name'",
        "t('project.name_placeholder'",
        "t('project.description'",
        "t('project.description_placeholder'",
        "t('project.select_status'",
        "t('project.select_date'",
      ]) {
        expect(source).toContain(key)
      }
    }
  })

  it('routes project create workflow copy through translations', () => {
    for (const sourcePath of projectCreatePageSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('project.create_page.page_title'",
        "t('project.create_page.hero_title'",
        "t('project.create_page.steps_heading'",
        "t(currentStepConfig.titleKey",
        "t('project.create_page.launch_summary.launch_immediately'",
        "t('project.create_page.launch_summary.collect_people_first'",
        "t('project.create_page.launch_summary.setup_roles_first'",
        "'project.create_page.staffing_coverage_summary'",
        "t('project.create_page.validation.required'",
        "'project.create_page.validation.duplicate_staffing'",
        "t('project.create_page.back'",
        "t('project.create_page.next'",
        "t('project.create_page.submit'",
        "labelKey: 'project.create_page.blueprints.delivery_squad.label'",
        "labelKey: 'project.create_page.blueprints.review_pipeline.label'",
        "labelKey: 'project.create_page.blueprints.marketplace_rollout.label'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Nền dự án',
        'Tên, tổ chức, trạng thái, timeline.',
        'Nhân sự',
        'Role khởi tạo và người phụ trách đầu tiên.',
        'Sau khi tạo',
        'Quyết định bước tiếp theo.',
        'Mở task ngay',
        'Thêm người trước',
        'Setup role trước',
        'Nhóm triển khai',
        'Luồng review',
        'Mở rộng marketplace',
        'role đã gán người.',
        'Trường này là bắt buộc',
        'Mỗi core member chỉ nên giữ một role slot lúc khởi tạo.',
        'Tạo dự án mới',
        'Tạo project',
        'Các bước',
        'Quay lại',
        'Tiếp theo',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }

    for (const sourcePath of projectCreateStaffingSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('project.create_page.delivery_model.heading'",
        "t('project.create_page.delivery_model.core_team'",
        "t('project.create_page.delivery_model.hybrid'",
        "t('project.create_page.delivery_model.exploration'",
        "t('project.create_page.staffing_focus.heading'",
        "t('project.create_page.staffing_focus.fill_now'",
        "t('project.create_page.staffing_focus.fill_after_scope'",
        "t('project.create_page.staffing_focus.explore_market'",
        "t('project.create_page.blueprint_heading'",
        "`project.create_page.blueprints.${preset}.label`",
        "t('project.create_page.initial_staffing.heading'",
        "t('project.create_page.initial_staffing.missing_organization'",
        "t('project.create_page.initial_staffing.no_members'",
        "t('project.create_page.initial_staffing.owner_label'",
        "t('project.create_page.initial_staffing.setup_later'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Cách vận hành',
        'Đội nòng cốt',
        'Kết hợp',
        'Khảo sát',
        'Ưu tiên sau khi tạo',
        'Lấp role trống',
        'Mở talent market',
        'Bộ role mẫu',
        'Gán người khởi tạo',
        'Chọn tổ chức để gán người phụ trách đầu tiên.',
        'Chưa có thành viên khả dụng.',
        'Người phụ trách đầu tiên',
        'Để setup sau',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }

    for (const sourcePath of projectCreateLaunchSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('project.create_page.launch_options.setup_roles_first'",
        "t('project.create_page.launch_options.collect_people_first'",
        "t('project.create_page.launch_options.launch_immediately'",
        "t('project.create_page.launch_summary_heading'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Setup role trước',
        'Thêm người trước',
        'Mở task đầu tiên',
        'Sau khi tạo',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }
  })

  it('routes project sprint panel copy and dates through translations', () => {
    for (const sourcePath of projectSprintPanelSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'currentDocumentLocale',
        "t('project.sprint_panel.load_error'",
        "t('project.sprint_panel.board_load_error'",
        "t('project.sprint_panel.move_to_sprint_success'",
        "t('project.sprint_panel.create_validation_error'",
        "t('project.sprint_panel.create_success'",
        "t('project.sprint_panel.close_sprint_success'",
        "t('project.sprint_panel.close_review_error'",
        '`project.sprint_panel.status.${status}`',
        "t('project.sprint_panel.review_debt_assigner'",
        "t('project.sprint_panel.review_debt_environment'",
        "t('project.sprint_panel.title'",
        "t('project.sprint_panel.refresh'",
        "t('project.sprint_panel.name_placeholder'",
        "t('project.sprint_panel.start_label'",
        "t('project.sprint_panel.create_button'",
        "t('project.sprint_panel.no_sprints'",
        "t('project.sprint_panel.sprint_goal'",
        "t('project.sprint_panel.backlog_title'",
        "t('project.sprint_panel.move_to_sprint'",
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toContain('Không thể tải sprint')
      expect(source).not.toContain('Tên sprint')
      expect(source).not.toContain('Kết thúc sprint')
      expect(source).not.toContain('Đưa vào sprint')
      expect(source).not.toContain('Chưa có sprint')
      expect(source).not.toContain('Đang review')
      expect(source).not.toContain('Sprint Goal:')
      expect(source).not.toContain('bg-white')
      expect(source).not.toContain('.toLocaleDateString()')
    }
  })

  it('routes project skills tab copy through translations and dark-safe tokens', () => {
    for (const sourcePath of projectSkillsTabSources) {
      const source = readSource(sourcePath)

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

  it('routes project workspace details, members, and roles copy through translations', () => {
    for (const sourcePath of projectDetailsTabSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('project.details_tab.info_title'",
        "t('project.details_tab.empty_value'",
        "t('project.name'",
        "t('project.description'",
        "t('project.status'",
        "t('project.start_date'",
        "t('project.end_date'",
        "t('project.creator'",
        "t('project.manager'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Thành viên',
        'Task đang chạy',
        'Task trễ',
        'Chưa có professional role',
        'người',
        'chưa có owner',
        'thành viên chưa có delivery role',
        'professional role chưa có owner',
        'Đã đủ để tiếp tục tạo task.',
        'Thông tin dự án',
        'Mô tả',
        'Không có',
        'Trạng thái',
        'Chờ duyệt',
        'Đang thực hiện',
        'Hoàn thành',
        'Đã hủy',
        'Ngày bắt đầu',
        'Ngày kết thúc',
        'Người tạo',
        'Quản lý',
        'Tên dự án',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }

    for (const sourcePath of [
      'inertia/apps/user/modules/projects/components/project_details_tab.svelte',
    ]) {
      const source = readSource(sourcePath)

      for (const key of [
        "t('project.details_tab.members'",
        "t('project.details_tab.running_tasks'",
        "t('project.details_tab.overdue_tasks'",
        "t('project.details_tab.delivery_coverage'",
        "t('project.details_tab.role_coverage'",
        "t('project.details_tab.need_staffing'",
        "t('project.details_tab.coverage_by_role'",
        "t('project.details_tab.no_professional_role'",
        "t('project.details_tab.people_count'",
        "t('project.details_tab.no_owner'",
        "t('project.details_tab.staffing_status'",
        "t('project.details_tab.members_without_delivery_role'",
        "t('project.details_tab.roles_without_owner'",
        "t('project.details_tab.staffing_ready'",
      ]) {
        expect(source).toContain(key)
      }
    }

    for (const sourcePath of projectMembersTabSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('project.members'",
        "t('project.add_member'",
        "t('project.members_tab.search_label'",
        "t('project.members_tab.search_placeholder'",
        "t('project.members_tab.choose_member_label'",
        "t('project.members_tab.choose_member_placeholder'",
        "t('project.members_tab.loading'",
        "t('project.members_tab.no_candidates'",
        "t('project.members_tab.project_role_label'",
        "t('project.members_tab.delivery_role_label'",
        "t('project.members_tab.unassigned_delivery_role'",
        "t('project.members_tab.loading_roles'",
        "t('project.members_tab.submit'",
        "t('project.members_tab.staffing_clarity'",
        "t('project.members_tab.member_missing_delivery'",
        "t('project.members_tab.empty'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Tìm thành viên tổ chức',
        'Tìm theo tên hoặc email...',
        'Chọn thành viên',
        'Đang tải...',
        'Không có thành viên khả dụng',
        'Vai trò trong dự án',
        'Professional role phụ trách',
        'Chưa gán delivery role',
        'Đang tải role...',
        'member chưa có delivery role',
        'Chưa có thành viên nào',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }

    for (const sourcePath of projectMemberCardSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('project.member_card.governance_label'",
        "t('project.member_card.delivery_label'",
        "t('project.member_card.unassigned_role'",
        "t('project.member_card.governance_role_label'",
        "t('project.member_card.delivery_role_label'",
        "t('project.member_card.unassigned_short'",
        "t('project.member_card.remove'",
        "t('project.member_card.unassigned_delivery_role'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Chưa gán role',
        'Chưa gán',
        'Xóa',
        'Chưa gán delivery role',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }

    for (const sourcePath of projectRolesTabSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('project.roles_tab.load_error'",
        "t('project.roles_tab.remove_skill_title'",
        "t('project.roles_tab.remove_skill_desc'",
        "t('project.roles_tab.remove_skill_confirm'",
        "t('project.roles_tab.cancel'",
        "t('project.roles_tab.remove_skill_success'",
        "t('project.roles_tab.remove_skill_error'",
        "t('project.roles_tab.deactivate_title'",
        "t('project.roles_tab.deactivate_desc'",
        "t('project.roles_tab.deactivate_confirm'",
        "t('project.roles_tab.deactivate_success'",
        "t('project.roles_tab.deactivate_error'",
        "t('project.roles_tab.active_count'",
        "t('project.roles_tab.add_role'",
        "t('project.roles_tab.loading'",
        "t('project.roles_tab.empty'",
        "t('project.roles_tab.completeness'",
        "t('project.roles_tab.skills_count'",
        "t('project.roles_tab.candidates'",
        "t('project.roles_tab.create_task'",
        "t('project.roles_tab.add_skill'",
        "t('project.roles_tab.empty_skills'",
        "t('project.roles_tab.mandatory'",
        "`project.roles_tab.importance.${importance}`",
        "t('project.roles_tab.edit'",
        "t('project.roles_tab.delete'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Không thể tải dữ liệu professional roles',
        'Xóa skill khỏi role',
        'khỏi role này?',
        'Hủy',
        'Đã xóa skill khỏi role',
        'Lỗi xóa skill',
        'Tắt professional role',
        'không thể dùng cho task mới',
        'Đã tắt role',
        'Lỗi tắt role',
        'role đang active',
        'Thêm Role',
        'Chưa có role.',
        'Cấu hình hoàn chỉnh',
        'Ứng viên',
        'Tạo task',
        'Thêm Skill',
        'Chưa có skill.',
        'Bắt buộc',
        'Sửa',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }

    for (const sourcePath of projectRoleSkillDialogSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('project.role_skill_dialog.update_success'",
        "t('project.role_skill_dialog.add_success'",
        "t('project.role_skill_dialog.save_error'",
        "t('project.role_skill_dialog.edit_title'",
        "t('project.role_skill_dialog.add_title'",
        "t('project.role_skill_dialog.skill_label'",
        "t('project.role_skill_dialog.skill_placeholder'",
        "t('project.role_skill_dialog.all_skills_added'",
        "t('project.role_skill_dialog.importance_label'",
        "`project.role_skill_dialog.importance.${level}`",
        "t('project.role_skill_dialog.weight_label'",
        "t('project.role_skill_dialog.mandatory_full'",
        "t('project.role_skill_dialog.mandatory_short'",
        "t('project.role_skill_dialog.cancel'",
        "t('project.role_skill_dialog.save'",
        "t('project.role_skill_dialog.add_skill'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Đã cập nhật cấu hình skill',
        'Đã thêm skill vào role',
        'Lỗi lưu cấu hình',
        'Sửa cấu hình Skill trong Role',
        'Thêm Skill vào Role',
        'Chọn Skill từ Catalog',
        'Chọn skill',
        'Role này đã có toàn bộ skill active trong Catalog.',
        'Mức độ quan trọng',
        'Trọng số',
        'Bắt buộc phải đạt level tối thiểu',
        'Bắt buộc',
        'Hủy',
        'Lưu thay đổi',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }
  })

  it('routes project show shells, detail modals, and operating model copy through translations', () => {
    for (const sourcePath of projectDetailModalSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('project.project_detail'",
        "t('project.deleted'",
        "t('project.detail_modal.update_success'",
        "t('project.detail_modal.update_error'",
        "t('project.detail_modal.organization_prefix'",
        "t('project.detail_modal.cancel_edit'",
        "t('project.detail_modal.saving'",
        "t('project.detail_modal.save'",
        "t('project.detail_modal.edit'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Lỗi khi tải dữ liệu',
        'Xác nhận xóa',
        'Bạn có chắc chắn muốn xóa?',
        'Dự án đã được xóa',
        'Lỗi khi xóa',
        'Đã cập nhật dự án thành công',
        'Không thể cập nhật dự án',
        'Đang tải...',
        'Chi tiết dự án',
        'Tổ chức:',
        'Tên dự án',
        'Trạng thái',
        'Mô tả',
        'Ngày bắt đầu',
        'Ngày kết thúc',
        'Thành viên',
        'Đóng',
        'Hủy sửa',
        'Đang lưu...',
        'Lưu',
        'Sửa',
        'Đang xóa...',
        'Xóa',
      ]) {
        expect(source).not.toContain(forbidden)
      }

      expect(source).not.toContain('text-gray-700')
      expect(source).not.toContain('text-gray-600')
    }

    for (const sourcePath of projectShowSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('project.show_page.delete_error'",
        "t('project.show_page.name_required'",
        "t('project.show_page.update_success'",
        "t('project.show_page.update_error'",
        "t('project.show_page.shell_org_detail'",
        "t('project.show_page.shell_user_detail'",
        "t('project.show_page.cancel_edit'",
        "t('project.show_page.saving'",
        "t('project.show_page.save'",
        "t('project.show_page.edit'",
        "t('project.show_page.delete'",
        "t('project.show_page.confirm_delete_project_title'",
        "t('project.show_page.confirm_remove_member_title'",
        "t('project.show_page.confirm_delete_project_desc'",
        "t('project.show_page.confirm_remove_member_desc'",
        "t('project.show_page.cancel'",
        "t('project.show_page.confirm'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Không thể xóa dự án',
        'Tên dự án là bắt buộc',
        'Đã cập nhật dự án',
        'Không thể cập nhật dự án',
        'Hủy sửa',
        'Đang lưu...',
        'Lưu',
        'Sửa',
        'Xóa',
        'Xóa dự án',
        'Xóa thành viên khỏi dự án',
        'Bạn có chắc chắn muốn xóa dự án này?',
        'Bạn có chắc chắn muốn xóa thành viên này khỏi dự án?',
        'Xác nhận',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }

    const userShowSource = readSource('inertia/apps/user/modules/projects/show.svelte')
    for (const key of [
      "t('project.show_page.review_governance_title'",
      "t('project.show_page.review_sessions'",
      "t('project.show_page.completed_summary'",
      "t('project.show_page.pending_reviews'",
      "t('project.show_page.required_pending'",
      "t('project.show_page.overdue'",
      "t('project.show_page.fallback_pending'",
      "t('project.show_page.disputes'",
      "t('project.show_page.dispute_hint'",
      "t('project.show_page.tab_overview'",
      "t('project.show_page.tab_members'",
      "t('project.show_page.tab_skills'",
      "t('project.show_page.tab_roles'",
    ]) {
      expect(userShowSource).toContain(key)
    }

    for (const forbidden of [
      'Hoàn thành',
      'Đang chờ review',
      'Reviewer bắt buộc còn nợ',
      'Quá hạn',
      'Reviewer dự phòng chờ',
      'Tranh chấp',
      'Cần theo dõi để không khóa profile kéo dài',
      'Tổng quan',
    ]) {
      expect(userShowSource).not.toContain(forbidden)
    }

    const orgShowSource = readSource('inertia/apps/org/modules/projects/show.svelte')
    for (const key of [
      "t('project.show_page.operating_model_title'",
      "t('project.show_page.sprint_section_label'",
      "t('project.show_page.sprint_eyebrow'",
      "t('project.show_page.sprint_title'",
      "t('project.show_page.sprint_desc'",
    ]) {
      expect(orgShowSource).toContain(key)
    }

    for (const forbidden of [
      'Sprint của project',
      'Quản lý project',
      'Kết thúc sprint hiện tại',
    ]) {
      expect(orgShowSource).not.toContain(forbidden)
    }

    for (const sourcePath of projectOperatingModelSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('project.operating_model.title'",
        "t('project.operating_model.description'",
        "t('project.operating_model.role_setup_title'",
        "t('project.operating_model.role_setup_desc'",
        "t('project.operating_model.definition_title'",
        "t('project.operating_model.definition_desc'",
        "t('project.operating_model.sprint_skip_title'",
        "t('project.operating_model.sprint_skip_desc'",
        "t('project.operating_model.preset_title'",
        "t('project.operating_model.no_roles'",
        "t('project.operating_model.review_owner'",
        "t('project.operating_model.create_task'",
        "t('project.operating_model.skill_ranges'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Task Factory tạo task từ role',
        'Role setup trước',
        'Role và skill dùng làm nguồn',
        'Task cần evidence',
        'Sprint bỏ qua demo',
        'Sprint là tùy chọn',
        'Preset tạo task',
        'Chưa có role active sẵn sàng',
        'Tạo task',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }
  })
})
