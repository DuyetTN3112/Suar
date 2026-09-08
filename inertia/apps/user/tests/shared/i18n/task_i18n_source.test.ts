import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  BUSINESS_DOMAIN_OPTIONS,
  PROBLEM_CATEGORY_OPTIONS,
  ROLE_IN_TASK_OPTIONS,
  TASK_TYPE_OPTIONS,
} from '@/apps/user/modules/tasks/lib/task_taxonomy'

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

const adminDisputeResolveSources = [
  'inertia/apps/admin/modules/disputes/components/dispute_resolve_tab.svelte',
  'inertia/apps/admin/modules/disputes/components/dispute_resolution_form.svelte',
  'inertia/apps/admin/modules/disputes/components/dispute_evidence_list.svelte',
] as const

const sprintReverseBoardSources = [
  'inertia/apps/user/modules/reviews/sprint-reverse-board.svelte',
] as const

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

const nativeCompletionReportSources = [
  'inertia/apps/shared/tasks/task_completion_report_native_form.svelte',
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

const taskSkillRequirementsSources = [
  'inertia/apps/user/modules/tasks/components/skill_requirements_tab.svelte',
  'inertia/apps/org/modules/tasks/components/skill_requirements_tab.svelte',
] as const

const taskSkillHistorySources = [
  'inertia/apps/user/modules/tasks/components/task_skill_history.svelte',
  'inertia/apps/org/modules/tasks/components/task_skill_history.svelte',
] as const

const taskAssignmentFieldSources = [
  'inertia/apps/user/modules/tasks/components/forms/task_assignment_fields.svelte',
  'inertia/apps/org/modules/tasks/components/forms/task_assignment_fields.svelte',
] as const

const taskVisibilityRuleSources = [
  'inertia/apps/user/modules/tasks/lib/rules/task_visibility.ts',
  'inertia/apps/org/modules/tasks/lib/rules/task_visibility.ts',
] as const

const taskFilesTabSources = [
  'inertia/apps/user/modules/tasks/components/detail/task_files_tab.svelte',
  'inertia/apps/org/modules/tasks/components/detail/task_files_tab.svelte',
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

const taskKanbanCardSources = [
  'inertia/apps/user/modules/tasks/components/views/kanban/kanban_card.svelte',
  'inertia/apps/org/modules/tasks/components/views/kanban/kanban_card.svelte',
] as const

const taskContractPresetSources = [
  'inertia/apps/user/modules/tasks/lib/rules/task_contract_presets.ts',
  'inertia/apps/org/modules/tasks/lib/rules/task_contract_presets.ts',
] as const

const taskWorkAreaStarterSources = [
  'inertia/apps/user/modules/tasks/lib/task_work_area_starters.ts',
  'inertia/apps/org/modules/tasks/lib/task_work_area_starters.ts',
] as const

const taskStatusManagementSources = [
  'inertia/apps/user/modules/tasks/stores/status_management_controller.svelte.ts',
  'inertia/apps/org/modules/tasks/stores/status_management_controller.svelte.ts',
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

describe('task i18n source guard', () => {
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

  it('routes task skill requirements copy through translations and dark-safe tokens', () => {
    for (const sourcePath of taskSkillRequirementsSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('task.skill_requirements.load_error'",
        "t('task.skill_requirements.remove_success'",
        "t('task.skill_requirements.remove_error'",
        "t('task.skill_requirements.count'",
        "t('task.skill_requirements.completeness'",
        "t('task.skill_requirements.completeness_help'",
        "t('task.skill_requirements.apply_role'",
        "t('task.skill_requirements.add_skill'",
        "t('task.skill_requirements.loading'",
        "t('task.skill_requirements.empty'",
        "t('task.skill_requirements.no_project'",
        "t('task.skill_requirements.mandatory'",
        "t('task.skill_requirements.edit'",
        "t('task.skill_requirements.confirm_title'",
        "'task.skill_requirements.confirm_desc'",
        "t('task.skill_requirements.confirm_fallback_skill'",
        "t('task.skill_requirements.cancel'",
        "t('task.skill_requirements.remove'",
        '`task.skill_requirements.importance.${req.importance}`',
        '`task.skill_requirements.source.${req.requirementSource}`',
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Không thể tải yêu cầu skill',
        'Đã xóa yêu cầu skill',
        'Lỗi xóa yêu cầu skill',
        'skill yêu cầu',
        'đầy đủ',
        'Tỷ lệ skill',
        'Áp role',
        'Thêm Skill',
        'Đang tải',
        'Task chưa có yêu cầu skill nào',
        'Task này không thuộc dự án',
        'Bắt buộc',
        'Sửa',
        'Xóa yêu cầu skill',
        'Bạn có chắc muốn xóa',
        'skill này',
        'Hủy',
        'bg-orange-50',
        'text-orange-700',
        'border-orange-200',
        'bg-slate-400',
        'text-slate-300',
        'text-indigo-600',
        'hover:bg-indigo-50',
      ]) {
        expect(source).not.toContain(forbidden)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes task skill history copy and dates through translations', () => {
    for (const sourcePath of taskSkillHistorySources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'currentDocumentLocale',
        'Intl.DateTimeFormat',
        'task.skill_history.title',
        'task.skill_history.snapshots',
        'task.skill_history.loading',
        'task.skill_history.empty',
        'task.skill_history.unknown_time',
        'task.skill_history.skills',
        'task.skill_history.added',
        'task.skill_history.modified',
        'task.skill_history.removed',
        'task.skill_history.by',
        'task.skill_history.reason.task_created',
        'task.skill_history.reason.task_assigned',
        'task.skill_history.reason.submission_sent',
        'task.skill_history.reason.review_started',
        'task.skill_history.reason.dispute_opened',
        'task.skill_history.reason.manual_edit',
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Đang tải version history',
        'Chưa có requirement snapshot',
        'Chưa rõ thời gian',
        ".toLocaleString('vi-VN')",
        'bg-orange-03',
      ]) {
        expect(source).not.toContain(forbidden)
      }

      expect(source).not.toMatch(/\bbg-amber-50\b/)
      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes task assignment, file, workflow, and kanban copy through translations', () => {
    for (const sourcePath of taskAssignmentFieldSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('task.assignment_fields.project'",
        "t('task.assignment_fields.task_visibility'",
        "t('task.assignment_fields.direct_assign_in_form'",
        "t('task.assignment_fields.parent_task'",
        'getTaskVisibilityLabel(formData.task_visibility, t)',
        'getTaskVisibilityDescription(formData.task_visibility, t)',
        'getOrganizationScopeLabel(t)',
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }

    for (const sourcePath of taskVisibilityRuleSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'task.visibility.options.internal.label',
        'task.visibility.options.external.description',
        'task.visibility.assignment.internal',
        'task.visibility.marketplace.external',
        'task.visibility.organization_scope',
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }

    for (const sourcePath of taskFilesTabSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('task.files_tab.load_error'",
        "t('task.files_tab.create_error'",
        "t('task.files_tab.delete_error'",
        "t('task.files_tab.title'",
        "t('task.files_tab.file_name'",
        "t('task.files_tab.add'",
        "t('task.files_tab.empty'",
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }

    for (const sourcePath of taskReviewWorkflowSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'currentDocumentLocale',
        'Intl.DateTimeFormat',
        "t('task.review_workflow.title'",
        "t('task.review_workflow.first_review_hint'",
        "t('task.review_workflow.send_review'",
        "t('task.review_workflow.accept_review'",
        "t('task.review_workflow.no_discussion'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        "toLocaleString('vi-VN'",
        'bg-emerald-600',
        'bg-rose-600',
        'text-white',
      ]) {
        expect(source).not.toContain(forbidden)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }

    for (const sourcePath of taskKanbanCardSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'currentDocumentLocale',
        'Intl.DateTimeFormat',
        "t('task.kanban_card.overdue_days'",
        "t('task.kanban_card.today'",
        "t('task.kanban_card.syncing'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of ["toLocaleDateString('vi-VN'", 'text-orange-700']) {
        expect(source).not.toContain(forbidden)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes admin dispute resolve tab copy and dates through translations', () => {
    for (const sourcePath of adminDisputeResolveSources) {
      const source = readSource(sourcePath)
      const expectedKeys = sourcePath.endsWith('dispute_resolve_tab.svelte')
        ? [
            'useTranslation()',
            "t('task.disputes.admin_detail.ai_verdict.title'",
            "t('task.disputes.admin_detail.ai_verdict.accept'",
            "t('task.disputes.admin_detail.ai_verdict.custom'",
            "t('task.disputes.admin_detail.ai_verdict.custom_label'",
          ]
        : sourcePath.endsWith('dispute_evidence_list.svelte')
          ? [
              'useTranslation()',
              'currentDocumentLocale',
              "t('task.disputes.admin_detail.resolve.evidence_snapshot'",
              "t('task.disputes.admin_detail.resolve.case_file_count'",
              "t('task.disputes.admin_detail.resolve.missing_data'",
              "t('task.disputes.admin_detail.resolve.task_comments_in_case_file'",
              "t('task.disputes.admin_detail.resolve.evidence_in_dossier'",
            ]
          : [
              'useTranslation()',
              "t('task.disputes.admin_detail.resolve.form.final_decision'",
              "t('task.disputes.admin_detail.resolve.form.rationale'",
              "t('task.disputes.admin_detail.resolve.form.resolve'",
            ]

      for (const key of expectedKeys) {
        expect(source).toContain(key)
      }

      expect(source).not.toContain("toLocaleString('vi-VN'")
      expect(source).not.toContain("toLocaleDateString('vi-VN'")
      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes task status-management controller copy through translations', () => {
    for (const sourcePath of taskStatusManagementSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('task.workflow.permission_title'",
        "t('task.workflow.board_sync_title'",
        "t('task.workflow.manage_wait_message'",
        "t('task.workflow.no_permission_error'",
        "t('task.workflow.board_sync_retry_error'",
        "t('task.workflow.status_name_required'",
        "t('task.workflow.status_name_invalid'",
        "t('task.workflow.status_group_required'",
        "t('task.workflow.create_success'",
        "t('task.workflow.create_failed'",
        "t('task.workflow.delete_success'",
        "t('task.workflow.delete_failed'",
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toContain("notificationStore.error('Bạn không đủ quyền")
      expect(source).not.toContain("notificationStore.success('Đã tạo trạng thái")
      expect(source).not.toContain("createStatusError = 'Tên trạng thái là bắt buộc'")
    }

    const orgSource = readSource(
      'inertia/apps/org/modules/tasks/stores/status_management_controller.svelte.ts'
    )
    for (const key of [
      "t('task.workflow.rename_success'",
      "t('task.workflow.rename_failed'",
      "t('task.workflow.reorder_success'",
      "t('task.workflow.reorder_failed'",
    ]) {
      expect(orgSource).toContain(key)
    }
  })
})
