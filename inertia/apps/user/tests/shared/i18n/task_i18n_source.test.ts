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
