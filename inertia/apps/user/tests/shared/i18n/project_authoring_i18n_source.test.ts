import { describe, expect, it } from 'vitest'

import { flattenKeys, readJson, readSource } from './support/i18n_source_test_helpers.js'

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

describe('project authoring i18n source guard', () => {
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
})
