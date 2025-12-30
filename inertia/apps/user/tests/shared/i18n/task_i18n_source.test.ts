import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const taskApplicationSources = [
  'inertia/apps/user/modules/tasks/applications.svelte',
  'inertia/apps/org/modules/tasks/applications.svelte',
] as const

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

const sprintReviewPackageSources = [
  'inertia/apps/user/modules/reviews/components/pending_sprint_review_packages.svelte',
  'inertia/apps/org/modules/reviews/components/pending_sprint_review_packages.svelte',
] as const

const sprintReviewDisputeDetailSources = [
  'inertia/apps/user/modules/reviews/sprint-disputes/show.svelte',
  'inertia/apps/org/modules/reviews/sprint-disputes/show.svelte',
] as const

const reviewDisputeDetailSources = [
  'inertia/apps/user/modules/reviews/disputes/show.svelte',
  'inertia/apps/org/modules/reviews/disputes/show.svelte',
] as const

const reviewShowSources = [
  'inertia/apps/user/modules/reviews/show.svelte',
  'inertia/apps/org/modules/reviews/show.svelte',
] as const

const reviewShowHeaderSources = [
  'inertia/apps/user/modules/reviews/components/review_show_header.svelte',
  'inertia/apps/org/modules/reviews/components/review_show_header.svelte',
] as const

const reviewResultsSectionSources = [
  'inertia/apps/user/modules/reviews/components/review_results_section.svelte',
  'inertia/apps/org/modules/reviews/components/review_results_section.svelte',
] as const

const managerReviewSectionSources = [
  'inertia/apps/user/modules/reviews/components/manager_review_section.svelte',
  'inertia/apps/org/modules/reviews/components/manager_review_section.svelte',
] as const

const reviewDisputeResponseTabSources = [
  'inertia/apps/user/modules/reviews/disputes/components/dispute_detail_response_tab.svelte',
  'inertia/apps/org/modules/reviews/disputes/components/dispute_detail_response_tab.svelte',
] as const

const adminDisputeResolveSources = [
  'inertia/apps/admin/modules/disputes/components/dispute_resolve_tab.svelte',
  'inertia/apps/admin/modules/disputes/components/dispute_resolution_form.svelte',
  'inertia/apps/admin/modules/disputes/components/dispute_evidence_list.svelte',
] as const

const reverseReviewPageSources = [
  'inertia/apps/user/modules/reviews/reverse-reviews.svelte',
  'inertia/apps/org/modules/reviews/reverse-reviews.svelte',
  'inertia/apps/admin/modules/reviews/reverse-reviews.svelte',
] as const

const sprintReverseBoardSources = [
  'inertia/apps/user/modules/reviews/sprint-reverse-board.svelte',
  'inertia/apps/org/modules/reviews/sprint-reverse-board.svelte',
] as const

const reviewCardSources = [
  'inertia/apps/user/modules/reviews/components/review_card.svelte',
  'inertia/apps/org/modules/reviews/components/review_card.svelte',
] as const

const skillRatingItemSources = [
  'inertia/apps/user/modules/reviews/components/skill_rating_item.svelte',
  'inertia/apps/org/modules/reviews/components/skill_rating_item.svelte',
] as const

const selfAssessmentPanelSources = [
  'inertia/apps/user/modules/reviews/components/self_assessment_panel.svelte',
  'inertia/apps/org/modules/reviews/components/self_assessment_panel.svelte',
] as const

const reviewEvidencePanelSources = [
  'inertia/apps/user/modules/reviews/components/review_evidence_panel.svelte',
  'inertia/apps/org/modules/reviews/components/review_evidence_panel.svelte',
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

const taskKanbanCardSources = [
  'inertia/apps/user/modules/tasks/components/views/kanban/kanban_card.svelte',
  'inertia/apps/org/modules/tasks/components/views/kanban/kanban_card.svelte',
] as const

const orgDisputeIndexSource = 'inertia/apps/org/modules/disputes/index.svelte'

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

  it('routes task application copy through translations', () => {
    for (const sourcePath of taskApplicationSources) {
      const source = readSource(sourcePath)

      for (const key of [
        "useTranslation()",
        'currentDocumentLocale',
        "t('task.applications.title'",
        "t('task.applications.subtitle'",
        "t('task.applications.applicant'",
        "t('task.applications.match_score'",
        "t('task.applications.rejection_reason'",
        "t('task.applications.approve_application_success'",
        "t('task.applications.reject_application_success'",
        "t('task.applications.status.pending'",
        "t('task.applications.candidate_source.project_member'",
        "t('task.applications.evidence_confidence.high'",
        "t('task.applications.fit.strong_match'",
        "t('task.applications.duration_days'",
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toContain("toLocaleDateString('vi-VN')")
      expect(source).not.toContain('Đề xuất tham gia</title>')
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
        "t('task.create.description_context_heading'",
        "t('task.create.merge_description'",
        "t('task.create.clear_suggestion_content'",
        "t('task.create.context_description'",
        "t('task.create.concrete_requirements'",
        "t('task.create.expected_outcome'",
        "t('task.create.extra_notes'",
        "t('task.create.description_placeholder'",
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
        "t('task.create.project'",
        "t('task.create.no_current_project'",
        "t('task.create.task_type'",
        "t('task.create.select_task_type'",
        "t('task.create.business_domain'",
        "t('task.create.select_business_domain'",
        "t('task.create.problem_category'",
        "t('task.create.select_problem_category'",
        "t('task.create.role_in_task'",
        "t('task.create.select_role'",
        "t('task.create.task_visibility'",
        "t('task.create.project_visibility'",
        "t('task.create.direct_assignment_summary'",
        "t('task.create.current_organization'",
        "t('task.create.current_assignee'",
        "t('task.create.parent_task'",
        "t('task.create.select_parent_task'",
        "t('task.create.visibility_assignment_rule.internal'",
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
        'getTaskContractPresets(t)',
        "getTaskContractPreset(formData.task_type, t)",
        "t('task.create.setup_tab'",
        "t('task.create.skills_tab'",
        "t('task.create.contract_tab'",
        "t('task.create.task_info'",
        "t('task.create.contract_details'",
        "t('task.create.contract_preset'",
        "t('task.create.apply_current_preset'",
        "t('task.create.acceptance_criteria'",
        "t('task.create.acceptance_criteria_placeholder'",
        "t('task.create.context_background'",
        "t('task.create.context_background_placeholder'",
        "t('task.create.tech_stack'",
        "t('task.create.domain_tags'",
        "t('task.create.learning_objectives'",
        "t('task.create.learning_objectives_placeholder'",
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
        "getTaskContractPreset(requestedTaskType, t)",
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
        "getTaskContractPreset(inferredTaskType, t)",
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
        "getTaskContractPreset(inferredTaskType, t)",
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
        'Thực thi',
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

  it('routes sprint review package copy and dates through translations', () => {
    for (const sourcePath of sprintReviewPackageSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'currentDocumentLocale',
        "t('task.sprint_review_packages.title'",
        "t('task.sprint_review_packages.subtitle'",
        "t('task.sprint_review_packages.pending_count'",
        "t('task.sprint_review_packages.load_error'",
        "t('task.sprint_review_packages.submit_success'",
        "t('task.sprint_review_packages.submit_error'",
        "t('task.sprint_review_packages.dispute_open_success'",
        "t('task.sprint_review_packages.dispute_comment_success'",
        "t('task.sprint_review_packages.report_success'",
        "t('task.sprint_review_packages.loading'",
        "t('task.sprint_review_packages.empty'",
        "t('task.sprint_review_packages.submitted_at'",
        "t('task.sprint_review_packages.status.submitted'",
        '`task.sprint_review_packages.role.${role}`',
        "t('task.sprint_review_packages.submit_button'",
        "t('task.sprint_review_packages.submitted_reviews_title'",
        "t('task.sprint_review_packages.dispute_title'",
        "t('task.sprint_review_packages.open_dispute_room'",
        "t('task.sprint_review_packages.manager_review_title'",
        "t('task.sprint_review_packages.environment_review_title'",
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toContain("toLocaleDateString('vi-VN')")
      expect(source).not.toContain("toLocaleString('vi-VN')")
      expect(source).not.toContain('Sprint reviews cần gửi')
      expect(source).not.toContain('Đã gửi sprint review')
      expect(source).not.toContain('Tranh chấp sprint review')
      expect(source).not.toContain('Mở phòng tranh chấp')
      expect(source).not.toContain('Không có nhận xét.')
      expect(source).not.toContain('Điểm')
      expect(source).not.toContain('Nhận xét')
    }
  })

  it('routes sprint review dispute detail copy and dates through translations', () => {
    for (const sourcePath of sprintReviewDisputeDetailSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'currentDocumentLocale',
        "t('task.sprint_review_disputes.detail.title'",
        "t('task.sprint_review_disputes.detail.subtitle'",
        "t('task.sprint_review_disputes.detail.comment_success'",
        "t('task.sprint_review_disputes.detail.report_success'",
        "t('task.sprint_review_disputes.detail.content_title'",
        "t('task.sprint_review_disputes.detail.reason'",
        "t('task.sprint_review_disputes.detail.requested_outcome'",
        "t('task.sprint_review_disputes.detail.discussion'",
        "t('task.sprint_review_disputes.detail.comment_count'",
        "t('task.sprint_review_disputes.detail.reply_as'",
        "t('task.sprint_review_disputes.detail.context_title'",
        "t('task.sprint_review_disputes.detail.escalation_title'",
        "t('task.sprint_review_disputes.detail.report_reason'",
        "t('task.sprint_review_disputes.detail.yes'",
        '`task.sprint_review_disputes.detail.context.${context}`',
        '`task.sprint_review_disputes.detail.status.${status}`',
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        "toLocaleString('vi-VN')",
        'Tranh chấp sprint review',
        'Phòng trao đổi chính thức',
        'Quay lại board review sau sprint',
        'Đã gửi phản hồi tranh chấp.',
        'Không gửi được phản hồi tranh chấp.',
        'Đã report tranh chấp lên admin.',
        'Không report được tranh chấp.',
        'Người gửi sprint review',
        'Đại diện project/org',
        'Đang tranh chấp',
        'Nội dung tranh chấp',
        'Lý do',
        'Thảo luận',
        'phản hồi',
        'Phản hồi với vai',
        'Gửi phản hồi',
        'Ngữ cảnh',
        'Đã report lên admin.',
        'Lý do report admin',
        'Vì sao hai bên không tự xử lý được?',
        'Cần phản hồi từ cả người gửi review',
        'Có',
        'Chưa',
        'bg-red-50',
        'border-red-200',
        'text-red-800',
        'text-amber-950',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }
  })

  it('routes reverse review page shell copy and dates through translations', () => {
    for (const sourcePath of reverseReviewPageSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'task.reverse_reviews.total_feedback',
        'task.reverse_reviews.anonymous',
        'task.reverse_reviews.target_spread',
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Lịch sử review môi trường',
        'Reverse review hệ thống',
        'Các review môi trường',
        'Bề mặt giám sát',
        'Tổng feedback',
        'Ẩn danh',
        'Đối tượng',
      ]) {
        expect(source).not.toContain(forbidden)
      }
    }

    const userSource = readSource('inertia/apps/user/modules/reviews/reverse-reviews.svelte')
    for (const key of [
      'currentDocumentLocale',
      'task.reverse_reviews.history_title',
      'task.reverse_reviews.legacy_title',
      'task.reverse_reviews.history_subtitle',
      'task.reverse_reviews.received_tab',
      'task.reverse_reviews.sent_tab',
      'task.reverse_reviews.received_title',
      'task.reverse_reviews.sent_title',
      'task.reverse_reviews.received_empty',
      'task.reverse_reviews.sent_empty',
      'task.reverse_reviews.view_detail',
      '`task.reverse_reviews.kind.${kind}`',
      '`task.reverse_reviews.status.${status}`',
    ]) {
      expect(userSource).toContain(key)
    }

    for (const forbidden of [
      "toLocaleString('vi-VN'",
      'Lịch sử review',
      'Tách rõ review',
      'Tôi nhận được',
      'Tôi đã gửi',
      'Review tôi nhận được',
      'Review tôi đã gửi',
      'Chưa có review nào bạn nhận được.',
      'Chưa có review nào bạn đã gửi.',
      'Xem chi tiết',
      'Chưa có thời gian',
      'Chờ review',
      'Tranh chấp',
    ]) {
      expect(userSource).not.toContain(forbidden)
    }

    expect(readSource('inertia/apps/org/modules/reviews/reverse-reviews.svelte')).toContain('task.reverse_reviews.legacy_title')
    expect(readSource('inertia/apps/admin/modules/reviews/reverse-reviews.svelte')).toContain('task.reverse_reviews.admin_title')
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

  it('routes skill rating item form copy through translations', () => {
    for (const sourcePath of skillRatingItemSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        '`task.reviews.skill_rating_item.category.${categoryCode}`',
        "t('task.reviews.skill_rating_item.task_requirement'",
        "t('task.reviews.skill_rating_item.mandatory'",
        "t('task.reviews.skill_rating_item.proficiency_label'",
        "t('task.reviews.skill_rating_item.rubric_selected'",
        "t('task.reviews.skill_rating_item.observable_behaviors'",
        "t('task.reviews.skill_rating_item.confidence_label'",
        "t('task.reviews.skill_rating_item.insufficient_evidence'",
        "t('task.reviews.skill_rating_item.evidence_linked'",
        "t('task.reviews.skill_rating_item.comment_label'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        'Công nghệ',
        'Kỹ thuật phần mềm',
        'Kỹ năng mềm',
        'Thực thi',
        'Yêu cầu task',
        'Bắt buộc',
        'trọng số',
        'Tối thiểu',
        'Mục tiêu',
        'Trần đánh giá',
        'Mức độ thành thạo',
        'Chọn mức độ',
        'Rubric cho mức đã chọn',
        'Hành vi quan sát được',
        'Độ tin cậy evidence',
        'Chưa chọn',
        'Thấp',
        'Vừa',
        'Cao',
        'Chưa đủ evidence',
        'Lý do',
        'Vì sao mức này',
        'Evidence liên kết',
        'Chưa có evidence',
        'Nhận xét',
        'Quan sát cụ thể',
        'border-blue-100',
        'text-blue-950',
      ]) {
        expect(source).not.toContain(forbidden)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes self assessment panel copy and dates through translations', () => {
    for (const sourcePath of selfAssessmentPanelSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'currentDocumentLocale',
        'Intl.DateTimeFormat',
        '`task.reviews.self_assessment.difficulty.${option.value}`',
        "t('task.reviews.self_assessment.load_error'",
        "t('task.reviews.self_assessment.save_error'",
        "t('task.reviews.self_assessment.loading'",
        "t('task.reviews.self_assessment.current_title'",
        "t('task.reviews.self_assessment.updated_at'",
        "t('task.reviews.self_assessment.title'",
        "t('task.reviews.self_assessment.overall_satisfaction'",
        "t('task.reviews.self_assessment.difficulty_label'",
        "t('task.reviews.self_assessment.save_button'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        "toLocaleString('vi-VN')",
        'Dễ hơn dự kiến',
        'Đúng như dự kiến',
        'Khó hơn dự kiến',
        'Rất thách thức',
        'Không thể tải tự đánh giá.',
        'Không thể lưu tự đánh giá.',
        'Đang tải tự đánh giá',
        'Bản tự đánh giá hiện tại',
        'Cập nhật lần cuối',
        'Tự đánh giá sau khi hoàn thành task',
        'Mức độ hài lòng',
        'Mức độ tự tin',
        'Cảm nhận độ khó',
        'Chọn cảm nhận độ khó',
        'Điều đã làm tốt',
        'Nếu làm lại',
        'Trở ngại đã gặp',
        'Mỗi dòng là một',
        'Kỹ năng còn thiếu',
        'Kỹ năng cảm thấy mạnh',
        'Đang lưu',
        'Cập nhật tự đánh giá',
        'Lưu tự đánh giá',
        'Chỉ người được review',
      ]) {
        expect(source).not.toContain(forbidden)
      }

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
        "t('task.detail_panel.learning_objectives'",
        "t('task.detail_panel.ai_dispute_info'",
        "t('task.detail_panel.task_type'",
        "t('task.detail_panel.affected_users'",
        "t('task.detail_panel.relative_overdue_days'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
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

  it('routes review evidence panel copy and dates through translations', () => {
    for (const sourcePath of reviewEvidencePanelSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        'currentDocumentLocale',
        'Intl.DateTimeFormat',
        '`task.reviews.evidence_panel.type.${option.value}`',
        "t('task.reviews.evidence_panel.load_error'",
        "t('task.reviews.evidence_panel.add_error'",
        "t('task.reviews.evidence_panel.task_comments_title'",
        "t('task.reviews.evidence_panel.task_comments_description'",
        "t('task.reviews.evidence_panel.add_title'",
        "t('task.reviews.evidence_panel.type_label'",
        "t('task.reviews.evidence_panel.attached_title'",
        "t('task.reviews.evidence_panel.open_link'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        "toLocaleString('vi-VN')",
        'Báo cáo test',
        'Tài liệu',
        'Ảnh chụp',
        'Ảnh chỉ số',
        'Khác',
        'Không thể tải evidence',
        'Không thể thêm evidence',
        'Comment task đính kèm',
        'Đây là log làm việc',
        'Thêm evidence',
        'Loại evidence',
        'Chọn loại evidence',
        'Tiêu đề',
        'Ví dụ',
        'Mô tả',
        'Ghi chú ngắn',
        'Đang lưu',
        'Lưu evidence',
        'Evidence đã đính kèm',
        'Tải lại',
        'Đang tải evidence',
        'Chưa có evidence',
        'Evidence không có tiêu đề',
        'Mở link evidence',
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
        "formatTaskVerificationMethodForDisplay(props.task.verification_method, t)",
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
        "t('task.context_card.learning_objectives'",
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

      for (const forbidden of [
        "toLocaleDateString('vi-VN'",
        'text-orange-700',
      ]) {
        expect(source).not.toContain(forbidden)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes review dispute detail shell copy through translations', () => {
    for (const sourcePath of reviewDisputeDetailSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'useTranslation()',
        "t('task.disputes.detail.page_title'",
        "t('task.disputes.detail.title'",
        "t('task.disputes.detail.back_to_task_board'",
        "t('task.disputes.detail.comments'",
        "t('task.disputes.detail.evidence'",
        "t('task.disputes.detail.task_unknown'",
        "t('task.disputes.detail.admin_decision_title'",
        "t('task.disputes.detail.final_decision'",
        "t('task.disputes.detail.final_rationale'",
        "t('task.disputes.detail.tabs.overview'",
        "`task.disputes.detail.status.${dispute.status}`",
        "t('task.disputes.detail.comment_success'",
        "t('task.disputes.detail.report_success'",
      ]) {
        expect(source).toContain(key)
      }

      expect(source).not.toMatch(/[À-ỹ]/)
    }
  })

  it('routes review show page shell copy and dates through translations', () => {
    for (const sourcePath of reviewShowSources) {
      const source = readSource(sourcePath)

      for (const key of [
        'currentDocumentLocale',
        'Intl.DateTimeFormat',
        "t('task.reviews.show.page_title'",
        "t('task.reviews.show.unknown_task'",
        "t('task.reviews.show.task_title'",
        "t('task.reviews.show.no_task_description'",
        "t('task.reviews.show.unset'",
        "t('task.reviews.show.difficulty'",
        "t('task.reviews.show.handoff_package'",
        "t('task.reviews.show.dispute_title'",
        "t('task.reviews.show.dispute_description'",
        "t('task.reviews.show.dispute_link'",
        "t('task.reviews.show.rate_tab'",
        "t('task.reviews.show.results_tab'",
        "t('task.reviews.show.self_tab'",
        "t('task.reviews.show.confirm_tab'",
        "t('task.reviews.show.rate_title'",
        "t('task.reviews.show.reviewer_type_hint'",
        "t('task.reviews.show.manager_reviewer'",
        "t('task.reviews.show.peer_reviewer'",
        "t('task.reviews.show.confirm_title'",
      ]) {
        expect(source).toContain(key)
      }

      for (const forbidden of [
        "toLocaleDateString('vi-VN'",
        'Chi tiết đánh giá',
        'Nhiệm vụ không xác định',
        'Task cần review',
        'Task này chưa có mô tả',
        'Chưa đặt',
        'Độ khó',
        'Gói bàn giao',
        'Đánh giá này đang bị khiếu nại',
        'Tiến trình cập nhật Profile',
        'Đi tới trang khiếu nại',
        'Đánh giá kỹ năng',
        'Kết quả',
        'Tự đánh giá',
        'Xác nhận',
        'Chọn loại reviewer',
        'Review người giao việc',
        'bg-amber-500/10',
        'text-amber-600',
        'border-amber-500/30',
