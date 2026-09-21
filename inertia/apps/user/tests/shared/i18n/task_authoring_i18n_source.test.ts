import { describe, expect, it } from 'vitest'

import {
  BUSINESS_DOMAIN_OPTIONS,
  PROBLEM_CATEGORY_OPTIONS,
  ROLE_IN_TASK_OPTIONS,
  TASK_TYPE_OPTIONS,
} from '@/apps/user/modules/tasks/lib/task_taxonomy'

import { flattenKeys, readJson, readSource } from './support/i18n_source_test_helpers.js'

const taskApplicationSources = [
  'inertia/apps/user/modules/tasks/applications.svelte',
  'inertia/apps/org/modules/tasks/applications.svelte',
] as const

const orgApplicationSources = ['inertia/apps/org/modules/applications/index.svelte'] as const

const myApplicationSources = [
  'inertia/apps/user/modules/applications/my-applications.svelte',
  'inertia/apps/org/modules/applications/my-applications.svelte',
] as const

const taskEditSources = [
  'inertia/apps/user/modules/tasks/edit.svelte',
  'inertia/apps/org/modules/tasks/edit.svelte',
] as const

const taskCreateBasicSources = [
  'inertia/apps/user/modules/tasks/components/modals/create_task_form/basic_fields.svelte',
  'inertia/apps/org/modules/tasks/components/modals/create_task_form/basic_fields.svelte',
] as const

const taskCreateMetadataSources = [
  'inertia/apps/user/modules/tasks/components/modals/create_task_form/metadata_fields.svelte',
  'inertia/apps/org/modules/tasks/components/modals/create_task_form/metadata_fields.svelte',
] as const

const taskCreateContractSources = [
  'inertia/apps/user/modules/tasks/components/modals/create_task_form.svelte',
  'inertia/apps/org/modules/tasks/components/modals/create_task_form.svelte',
] as const

const taskCreatePageSources = [
  'inertia/apps/user/modules/tasks/create.svelte',
  'inertia/apps/org/modules/tasks/create.svelte',
] as const

const taskCreateStoreSources = [
  'inertia/apps/user/modules/tasks/components/modals/create_task_store.svelte.ts',
  'inertia/apps/org/modules/tasks/components/modals/create_task_store.svelte.ts',
] as const

const taskRolePrefillSources = [
  'inertia/apps/user/modules/tasks/components/detail/task_role_prefill_panel.svelte',
  'inertia/apps/org/modules/tasks/components/detail/task_role_prefill_panel.svelte',
] as const

const marketplaceCardSources = [
  'inertia/apps/user/modules/marketplace/components/marketplace_task_card.svelte',
  'inertia/apps/org/modules/marketplace/components/marketplace_task_card.svelte',
] as const

const marketplaceFilterSources = [
  'inertia/apps/user/modules/marketplace/components/marketplace_filters.svelte',
  'inertia/apps/org/modules/marketplace/components/marketplace_filters.svelte',
] as const

const taskDetailPanelSources = [
  'inertia/apps/user/modules/tasks/components/detail/task_detail_panel.svelte',
  'inertia/apps/org/modules/tasks/components/detail/task_detail_panel.svelte',
] as const

const taskSubmissionPanelSources = [
  'inertia/apps/user/modules/tasks/components/detail/task_submission_panel.svelte',
  'inertia/apps/org/modules/tasks/components/detail/task_submission_panel.svelte',
] as const

const nativeCompletionReportSources = [
  'inertia/apps/shared/tasks/task_completion_report_native_form.svelte',
] as const

const taskReviewWorkflowSources = [
  'inertia/apps/user/modules/tasks/components/detail/task_review_workflow_panel.svelte',
  'inertia/apps/org/modules/tasks/components/detail/task_review_workflow_panel.svelte',
] as const

const taskReviewWorkflowCallerSources = [
  'inertia/apps/user/modules/tasks/show.svelte',
  'inertia/apps/org/modules/tasks/show.svelte',
  'inertia/apps/user/modules/reviews/task-board.svelte',
] as const

const reviewObservationAuthoringSources = [
  'inertia/apps/shared/components/review_observation_authoring_panel.svelte',
] as const

const taskContractPresetSources = [
  'inertia/apps/user/modules/tasks/lib/rules/task_contract_presets.ts',
  'inertia/apps/org/modules/tasks/lib/rules/task_contract_presets.ts',
] as const

const taskWorkAreaStarterSources = [
  'inertia/apps/user/modules/tasks/lib/task_work_area_starters.ts',
  'inertia/apps/org/modules/tasks/lib/task_work_area_starters.ts',
] as const

describe('task authoring i18n source guard', () => {
  it('keeps English and Vietnamese task resources in sync', () => {
    expect(flattenKeys(readJson('resources/lang/en/task.json')).sort()).toEqual(
      flattenKeys(readJson('resources/lang/vi/task.json')).sort()
    )
  })

  it('routes native completion report copy through the caller translation function', () => {
    for (const sourcePath of nativeCompletionReportSources) {
      const source = readSource(sourcePath)
      expect(source).toContain('task.submission_panel.native')
    }

    for (const sourcePath of taskSubmissionPanelSources) {
      expect(readSource(sourcePath)).toContain('translate={t}')
    }
  })

  it('routes reviewer observation copy through the caller translation function', () => {
    for (const sourcePath of reviewObservationAuthoringSources) {
      const source = readSource(sourcePath)
      expect(source).toContain('translate?.')
      expect(source).toContain('task.review_observation.')
    }

    for (const sourcePath of taskReviewWorkflowSources) {
      expect(readSource(sourcePath)).toContain('{translate}')
    }

    for (const sourcePath of taskReviewWorkflowCallerSources) {
      expect(readSource(sourcePath)).toContain('translate={t}')
    }
  })

  it('keeps task taxonomy labels complete and routes every taxonomy consumer through i18n', () => {
    const taxonomyOptions = {
      task_type: TASK_TYPE_OPTIONS,
      business_domain: BUSINESS_DOMAIN_OPTIONS,
      problem_category: PROBLEM_CATEGORY_OPTIONS,
      role_in_task: ROLE_IN_TASK_OPTIONS,
    } as const

    for (const locale of ['en', 'vi'] as const) {
      const resource = readJson(`resources/lang/${locale}/task.json`) as {
        task?: { taxonomy?: Record<string, Record<string, unknown>> }
      }

      for (const [group, options] of Object.entries(taxonomyOptions)) {
        expect(Object.keys(resource.task?.taxonomy?.[group] ?? {}).sort()).toEqual(
          options.map((option) => option.value).sort()
        )
      }
    }

    for (const sourcePath of [
      ...taskEditSources,
      ...taskCreateMetadataSources,
      ...marketplaceFilterSources,
    ]) {
      expect(readSource(sourcePath)).toContain('task.taxonomy.${group}.${option.value}')
    }

    for (const sourcePath of marketplaceCardSources) {
      const source = readSource(sourcePath)
      expect(source).toContain('task.taxonomy.${group}.${value}')
      expect(source).toContain(
        'formatTaskVerificationMethodForDisplay(task.verification_method, t)'
      )
    }

    for (const sourcePath of taskDetailPanelSources) {
      expect(readSource(sourcePath)).toContain(
        'formatTaskVerificationMethodForDisplay(task?.verification_method, t)'
      )
    }
  })

  it('routes task application copy through translations', () => {
    for (const sourcePath of taskApplicationSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'currentDocumentLocale',
        'task.applications.title',
        'task.applications.subtitle',
        'task.applications.applicant',
        'task.applications.match_score',
        'task.applications.rejection_reason',
        'task.applications.approve_application_success',
        'task.applications.reject_application_success',
        'task.applications.status.pending',
        'task.applications.candidate_source.project_member',
        'task.applications.evidence_confidence.high',
        'task.applications.fit.strong_match',
        'task.applications.duration_days',
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toContain("toLocaleDateString('vi-VN')")
      expect(source).not.toContain('Đề xuất tham gia</title>')
      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes org application inbox copy through translations', () => {
    for (const sourcePath of orgApplicationSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'currentDocumentLocale',
        'task.applications.title',
        'task.applications.org_eyebrow',
        'task.applications.subtitle',
        'task.applications.empty_state',
        'task.applications.task',
        'task.applications.pending_count',
        'task.applications.source',
        'task.applications.submitted_at',
        'task.applications.actions',
        'task.applications.view_applications',
        'task.applications.inbox.pending_count_one',
        'task.applications.inbox.pending_count_other',
        'task.applications.inbox.total_count_one',
        'task.applications.inbox.total_count_other',
        'task.applications.inbox.newest_application',
        'task.applications.candidate_source.project_member',
        'task.applications.candidate_source.org_member',
        'task.applications.candidate_source.external',
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toContain('toLocaleDateString()')
      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes my application copy and dates through translations', () => {
    for (const sourcePath of myApplicationSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'currentDocumentLocale',
        'task.my_applications.title',
        'task.my_applications.subtitle',
        'task.my_applications.status.pending',
        'task.my_applications.withdraw_success',
        'task.my_applications.empty_title',
        'task.my_applications.task_header',
        'task.my_applications.withdraw_button',
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        "toLocaleDateString('vi-VN')",
        "toLocaleString('vi-VN'",
        'Đề xuất tham gia của tôi',
        'Người dùng / Đề xuất đã gửi',
        'Theo dõi trạng thái',
        'Chờ duyệt',
        'Được chọn',
        'Đã đóng',
        'Bạn chưa có đề xuất tham gia nào',
        'Tới thị trường task',
        'Nhiệm vụ</TableHead>',
        'Proof đã gửi',
        'Rút đề xuất lúc',
        'Lý do từ chối',
        'Đang rút...',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }
  })

  it('routes task edit page copy through translations', () => {
    for (const sourcePath of taskEditSources) {
      const source = readSource(sourcePath)

      for (const key of [
        "t('task.edit.current_status'",
        "t('task.edit.organization'",
        "t('task.edit.task_access'",
        "t('task.edit.assignee'",
        "t('task.edit.unassigned_assignee'",
        "t('task.edit.basic_tab'",
        "t('task.edit.context_tab'",
        "t('task.edit.task_context'",
        "t('task.edit.task_type'",
        "t('task.edit.acceptance_criteria'",
        "t('task.edit.context_background'",
        "t('task.edit.learning_objectives'",
        "t('task.edit.no_selection'",
        "t('task.edit.project_required'",
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toContain('>Trạng thái hiện tại:')
      expect(source).not.toContain("newErrors.project_id = 'Project")
      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes task create basic description helper copy through translations', () => {
    for (const sourcePath of taskCreateBasicSources) {
      const source = readSource(sourcePath)

      for (const key of [
        "t('task.create.task_brief'",
        "t('task.create.task_brief_help'",
        "t('task.create.task_brief_placeholder'",
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toContain('>Ghép vào mô tả')
      expect(source).not.toContain('placeholder="Mô tả task"')
      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes task create metadata copy through translations', () => {
    for (const sourcePath of taskCreateMetadataSources) {
      const source = readSource(sourcePath)

      for (const key of [
        "t('task.create.task_type'",
        "t('task.create.select_task_type'",
        "t('task.create.problem_category'",
        "t('task.create.select_problem_category'",
        "t('task.create.role_in_task'",
        "t('task.create.role_in_task_help'",
        "t('task.create.select_role'",
        "t('task.create.task_visibility'",
        "t('task.create.parent_task'",
        "t('task.create.select_parent_task'",
        "t('task.create.visibility.internal'",
        "t('task.create.visibility.external'",
        "t('task.create.visibility.all'",
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toContain('getTaskVisibilityLabel')
      expect(source).not.toContain('>Phạm vi task</Label>')
      expect(source).not.toContain('>Task cha</Label>')
      expect(source).not.toContain("?? 'Chưa có project hiện tại'")
      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes task create contract copy through translations', () => {
    for (const sourcePath of taskCreateContractSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('task.create.setup_tab'",
        "t('task.create.skills_tab'",
        "t('task.create.contract_tab'",
        "t('task.create.task_info'",
        "t('task.create.contract_details'",
        "t('task.create.contract_details_help'",
        "t('task.create.acceptance_criteria'",
        "t('task.create.acceptance_criteria_placeholder'",
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toContain('>Cơ bản</TabsTrigger>')
      expect(source).not.toContain('>Nghiệm thu</TabsTrigger>')
      expect(source).not.toContain('>Mẫu tiêu chí')
      expect(source).not.toContain('Áp preset hiện tại')
      expect(source).not.toContain('placeholder="Điều kiện hoàn thành')
    }
  })

  it('routes task create page summary and validation copy through translations', () => {
    for (const sourcePath of taskCreatePageSources) {
      const source = readSource(sourcePath)

      for (const key of [
        "t('task.create.project_required'",
        "t('task.create.acceptance_criteria_required'",
        "t('task.create.no_project_selected'",
        "t('task.create.current_organization_value'",
        "t('task.create.task_access'",
        "t('task.create.no_assignee'",
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toContain("newErrors.project_id = 'Project")
      expect(source).not.toContain("newErrors.acceptance_criteria = 'Tiêu chí")
      expect(source).not.toContain('Chưa chọn project')
      expect(source).not.toContain('Chưa gán assignee')
    }
  })

  it('routes task create modal store validation and toast copy through translations', () => {
    for (const sourcePath of taskCreateStoreSources) {
      const source = readSource(sourcePath)

      for (const key of [
        "t('task.create.project_required'",
        "t('task.create.acceptance_criteria_required'",
        "t('task.create.role_prefill_failed'",
        "t('task.create.permission_create_denied'",
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toContain("newErrors.project_id = 'Project")
      expect(source).not.toContain("newErrors.acceptance_criteria = 'Tiêu chí")
      expect(source).not.toContain("notificationStore.error('Không thể prefill")
      expect(source).not.toContain("'Bạn không đủ quyền tạo nhiệm vụ'")
    }
  })

  it('routes task role prefill panel copy through translations', () => {
    for (const sourcePath of taskRolePrefillSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('task.role_prefill.apply_by_role'",
        "t('task.role_prefill.suggested_assignee'",
        "t('task.role_prefill.match_count'",
        "t('task.role_prefill.current_role_fallback'",
        "t('task.role_prefill.selected'",
        "t('task.role_prefill.quick_assign'",
        "t('task.role_prefill.no_matching_assignee'",
        "t('task.role_prefill.select_role'",
        "t('task.role_prefill.loading'",
        "t('task.role_prefill.no_project_roles'",
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toContain('Áp theo role')
      expect(source).not.toContain('Gợi ý assignee')
      expect(source).not.toContain('Chưa có assignee phù hợp.')
      expect(source).not.toContain('Project này chưa có role.')
    }
  })

  it('keeps task starter and contract preset data translation-key based', () => {
    for (const sourcePath of taskContractPresetSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'TaskTranslator',
        'getTaskContractPresets',
        'translateTaskContractPreset',
        'task.contract_presets.feature_development.acceptance_criteria',
        'task.contract_presets.bug_fix.context_background',
        'task.contract_presets.architecture_design.learning_objectives.1',
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toContain('Flow hoàn thành')
      expect(source).not.toContain('Bug tái hiện')
      expect(source).not.toContain('Quan sát execution quality')
    }

    for (const sourcePath of taskWorkAreaStarterSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'TaskTranslator',
        'getTaskWorkAreaStarters',
        'translateTaskWorkAreaStarter',
        'task.work_area_starters.authentication.description',
        'task.work_area_starters.audit_logging.context_background',
        'task.work_area_starters.quality_control.learning_objectives.1',
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toContain('Đăng nhập, phiên')
      expect(source).not.toContain('Task thuộc lớp')
      expect(source).not.toContain('Quan sát tư duy')
    }
  })
})
