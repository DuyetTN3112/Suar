import { describe, expect, it } from 'vitest'

import { readSource } from './support/i18n_source_test_helpers.js'

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

const adminDisputeResolveSources = [
  'inertia/apps/admin/modules/disputes/components/dispute_resolve_tab.svelte',
  'inertia/apps/admin/modules/disputes/components/dispute_resolution_form.svelte',
  'inertia/apps/admin/modules/disputes/components/dispute_evidence_list.svelte',
] as const

const taskStatusManagementSources = [
  'inertia/apps/user/modules/tasks/stores/status_management_controller.svelte.ts',
  'inertia/apps/org/modules/tasks/stores/status_management_controller.svelte.ts',
] as const

describe('task workspace i18n source guard', () => {
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
