export type TaskCreateIntent = 'save_draft' | 'publish'

export type TaskCreateValidationField =
  | 'title'
  | 'description'
  | 'task_status_id'
  | 'project_id'
  | 'priority'
  | 'label'
  | 'estimated_time'
  | 'due_date'
  | 'assigned_to'
  | 'brief_work_items'
  | 'brief_current_state'
  | 'brief_scope'
  | 'brief_optional_details'
  | 'brief_deliverables'
  | 'brief_acceptance'
  | 'required_skills'
  | 'verification_method'
  | 'reviewer_user_id'
  | 'creator_confirmed'

import type { TaskBriefV2 } from '@/apps/shared/tasks/task_brief_contract'

export type TaskCreateTab = 'setup' | 'skills' | 'assignment' | 'planning' | 'contract'

interface TaskCreateValidationSkill {
  id: string
  name?: string
  rubric_version_id?: string | null
  assessment_ceiling_level_id?: string | null
}

export interface TaskCreateValidationData {
  title: string
  description: string
  task_status_id: string
  project_id: string
  priority: string
  label: string
  estimated_time: string
  due_date: string
  assigned_to: string
  brief: TaskBriefV2
  required_skills: TaskCreateValidationSkill[]
  verification_method: string
  reviewer_user_id?: string
  authoring_mode?: 'operational_only' | 'evidence_enabled'
  is_documentation_item?: boolean
  creator_confirmed?: boolean
  constraints_addressed?: boolean
  dependencies_addressed?: boolean
}

export type TaskCreateValidationErrors = Partial<Record<TaskCreateValidationField, string>>

export type TaskCreateTranslate = (
  key: string,
  params: Record<string, unknown>,
  fallback: string
) => string

const PLACEHOLDER_PHRASES = new Set([
  '-',
  'n/a',
  'na',
  'none',
  'see docs',
  'see document',
  'tbd',
  'todo',
  'xem docs',
  'xem tài liệu',
  'xem tai lieu',
])

const PLACEHOLDER_TOKENS = new Set([
  'docs',
  'document',
  'later',
  'lieu',
  'n',
  'na',
  'none',
  'see',
  'tai',
  'tbd',
  'todo',
  'xem',
])

export const TASK_CREATE_VALIDATION_ORDER: readonly TaskCreateValidationField[] = [
  'title',
  'task_status_id',
  'project_id',
  'priority',
  'label',
  'description',
  'estimated_time',
  'due_date',
  'assigned_to',
  'brief_work_items',
  'brief_current_state',
  'brief_scope',
  'brief_optional_details',
  'brief_deliverables',
  'brief_acceptance',
  'required_skills',
  'verification_method',
  'reviewer_user_id',
  'creator_confirmed',
]

export const TASK_CREATE_FIELD_TAB: Record<TaskCreateValidationField, TaskCreateTab> = {
  title: 'setup',
  description: 'setup',
  task_status_id: 'setup',
  project_id: 'setup',
  priority: 'planning',
  label: 'planning',
  estimated_time: 'planning',
  due_date: 'planning',
  assigned_to: 'assignment',
  brief_work_items: 'setup',
  brief_current_state: 'setup',
  brief_scope: 'setup',
  brief_optional_details: 'setup',
  brief_deliverables: 'contract',
  brief_acceptance: 'contract',
  required_skills: 'skills',
  verification_method: 'contract',
  reviewer_user_id: 'contract',
  creator_confirmed: 'contract',
}

export const TASK_CREATE_FIELD_FOCUS_ID: Record<TaskCreateValidationField, string> = {
  title: 'title',
  description: 'description',
  task_status_id: 'task_status_id',
  project_id: 'project_id',
  priority: 'priority',
  label: 'label',
  estimated_time: 'estimated_time',
  due_date: 'due-date-field',
  assigned_to: 'assigned-to-field',
  brief_work_items: 'brief-work-items',
  brief_current_state: 'brief-current-state',
  brief_scope: 'brief-scope',
  brief_optional_details: 'brief-scope',
  brief_deliverables: 'brief-deliverables',
  brief_acceptance: 'brief-deliverables',
  required_skills: 'required-skills-field',
  verification_method: 'verification-method-field',
  reviewer_user_id: 'reviewer_user_id',
  creator_confirmed: 'creator_confirmed',
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi-VN')
}

export function isMeaningfulTaskCreateText(value: string | null | undefined): boolean {
  const normalized = normalizeText(value)
  if (!normalized || PLACEHOLDER_PHRASES.has(normalized)) return false

  const tokens = normalized
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(' ')
    .filter(Boolean)

  return tokens.length > 0 && !tokens.every((token) => PLACEHOLDER_TOKENS.has(token))
}

function translated(
  t: TaskCreateTranslate,
  key: string,
  fallback: string,
  params: Record<string, unknown> = {}
): string {
  return t(key, params, fallback)
}

export function validateTaskCreate(
  formData: TaskCreateValidationData,
  intent: TaskCreateIntent,
  t: TaskCreateTranslate
): TaskCreateValidationErrors {
  const errors: TaskCreateValidationErrors = {}
  const title = formData.title.trim()

  const isDocumentationItem = formData.is_documentation_item === true

  if ((intent === 'publish' || isDocumentationItem) && !title) {
    errors.title = translated(t, 'task.validation.title_required', 'Title is required')
  } else if ((intent === 'publish' || isDocumentationItem) && title.length < 3) {
    errors.title = translated(t, 'task.validation.title_min', 'Title must contain at least 3 characters')
  } else if (title.length > 255) {
    errors.title = translated(t, 'task.validation.title_max', 'Title must not exceed 255 characters')
  }

  if (!formData.task_status_id) {
    errors.task_status_id = translated(t, 'task.validation.status_required', 'Status is required')
  }

  if (!formData.project_id) {
    errors.project_id = translated(t, 'task.create.project_required', 'Project is required')
  }

  if (formData.description.length > 5000) {
    errors.description = translated(
      t,
      'task.validation.description_max',
      'Description must not exceed 5,000 characters'
    )
  }

  const estimatedTime = formData.estimated_time.trim()
  if (estimatedTime && (!Number.isFinite(Number(estimatedTime)) || Number(estimatedTime) < 0)) {
    errors.estimated_time = translated(
      t,
      'task.validation.estimated_time_non_negative',
      'Estimated time must be zero or greater'
    )
  }

  if (formData.due_date) {
    const dueDate = new Date(`${formData.due_date}T00:00:00`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (Number.isNaN(dueDate.getTime())) {
      errors.due_date = translated(t, 'task.validation.due_date_invalid', 'Due date is invalid')
    } else if (dueDate < today) {
      errors.due_date = translated(
        t,
        'task.validation.due_date_past',
        'Due date cannot be in the past'
      )
    }
  } else if (intent === 'publish' && !isDocumentationItem) {
    errors.due_date = translated(
      t,
      'task.validation.due_date_required',
      'Chọn ngày hết hạn trước khi đăng Task'
    )
  }

  if (isDocumentationItem) {
    if (title && !isMeaningfulTaskCreateText(title)) {
      errors.title = translated(
        t,
        'task.validation.title_meaningful',
        'Use a specific title instead of placeholder text'
      )
    }
    if (!isMeaningfulTaskCreateText(formData.description)) {
      errors.description = translated(
        t,
        'task.validation.docs_content_required',
        'Add the document content or a link to it'
      )
    }
    return errors
  }

  if (intent === 'save_draft') return errors

  const requireMeaningful = (
    field: TaskCreateValidationField,
    value: string | null | undefined,
    key: string,
    fallback: string
  ) => {
    if (!isMeaningfulTaskCreateText(value)) {
      errors[field] = translated(t, key, fallback)
    }
  }

  if (title && !isMeaningfulTaskCreateText(title)) {
    errors.title = translated(
      t,
      'task.validation.title_meaningful',
      'Use a specific title instead of placeholder text'
    )
  }

  requireMeaningful(
    'priority',
    formData.priority,
    'task.validation.priority_required',
    'Select a priority before publishing'
  )
  requireMeaningful(
    'label',
    formData.label,
    'task.validation.label_required',
    'Select a label before publishing'
  )
  if (!isMeaningfulTaskCreateText(estimatedTime)) {
    errors.estimated_time = translated(
      t,
      'task.validation.estimated_time_required',
      'Enter an estimated time before publishing'
    )
  }
  const hasCompleteWorkItem = formData.brief.workItems.some((item) =>
    isMeaningfulTaskCreateText(item.affectedArea) &&
    isMeaningfulTaskCreateText(item.requiredChange) &&
    isMeaningfulTaskCreateText(item.resultingBehaviour)
  )
  const hasIncompleteWorkItem = formData.brief.workItems.some((item) => {
    const values = [item.affectedArea, item.requiredChange, item.resultingBehaviour]
    return values.some(isMeaningfulTaskCreateText) && !values.every(isMeaningfulTaskCreateText)
  })
  if (hasIncompleteWorkItem) {
    errors.brief_work_items = translated(
      t,
      'task.validation.work_items_incomplete',
      'Hoàn thiện hoặc xóa từng hạng mục công việc đang điền dở'
    )
  } else if (!hasCompleteWorkItem) {
    errors.brief_work_items = translated(
      t,
      'task.validation.work_items_required',
      'Thêm ít nhất một hạng mục có phần bị tác động, thay đổi và hành vi sau thay đổi'
    )
  }

  if (![
    formData.brief.currentState,
    formData.brief.currentStateSituation,
    formData.brief.affectedParties,
    formData.brief.impactIfUnresolved,
  ].every(isMeaningfulTaskCreateText)) {
    errors.brief_current_state = translated(
      t,
      'task.validation.current_state_required',
      'Làm rõ hiện trạng, nơi xảy ra, phần bị ảnh hưởng và hậu quả nếu chưa xử lý'
    )
  }

  if (!formData.brief.scope.some((item) => isMeaningfulTaskCreateText(item.text))) {
    errors.brief_scope = translated(
      t,
      'task.validation.scope_required',
      'Nêu ít nhất một phần hoặc hành vi nằm trong Task'
    )
  }

  const hasIncompleteRequiredDetail = [
    formData.brief.outOfScope.length === 0 ||
      !formData.brief.outOfScope.some((item) => isMeaningfulTaskCreateText(item.text)),
    formData.brief.businessRules.some((item) => {
      const values = [item.actor, item.condition, item.permission, item.systemResult]
      return values.some(isMeaningfulTaskCreateText) && !values.every(isMeaningfulTaskCreateText)
    }),
    formData.brief.businessRules.length === 0 ||
      !formData.brief.businessRules.some((item) =>
        [item.actor, item.condition, item.permission, item.systemResult].every(isMeaningfulTaskCreateText)
      ),
    formData.brief.constraints.length === 0 ||
      !formData.brief.constraints.some((item) => isMeaningfulTaskCreateText(item.text)),
    formData.brief.dependencies.some((item) => {
      const values = [item.dependency, item.owner]
      return values.some(isMeaningfulTaskCreateText) && !values.every(isMeaningfulTaskCreateText)
    }),
    formData.brief.dependencies.length === 0 ||
      !formData.brief.dependencies.some((item) =>
        [item.dependency, item.owner].every(isMeaningfulTaskCreateText)
      ),
  ].some(Boolean)
  const hasIncompleteRequiredQuality =
    formData.brief.qualityRequirements.length === 0 ||
    !formData.brief.qualityRequirements.some((item) =>
      [item.property, item.appliesTo, item.observableCheck].every(isMeaningfulTaskCreateText)
    )
  const hasIncompleteRequiredDesiredValue =
    !formData.brief.desiredValue ||
    ![
      formData.brief.desiredValue.beneficiary,
      formData.brief.desiredValue.usefulState,
    ].every(isMeaningfulTaskCreateText)
  const hasIncompleteOptionalDetail = [
    hasIncompleteRequiredQuality,
    hasIncompleteRequiredDesiredValue,
    formData.brief.qualityRequirements.some((item) => {
      const values = [item.property, item.appliesTo, item.observableCheck]
      return values.some(isMeaningfulTaskCreateText) && !values.every(isMeaningfulTaskCreateText)
    }),
    Boolean(
      formData.brief.desiredValue &&
        [formData.brief.desiredValue.beneficiary, formData.brief.desiredValue.usefulState]
          .some(isMeaningfulTaskCreateText) &&
        ![formData.brief.desiredValue.beneficiary, formData.brief.desiredValue.usefulState]
          .every(isMeaningfulTaskCreateText)
    ),
  ].some(Boolean)
  if (hasIncompleteRequiredDetail || hasIncompleteOptionalDetail) {
    errors.brief_optional_details = translated(
      t,
      'task.validation.required_details_incomplete',
      'Hoàn thiện yêu cầu chất lượng, giá trị mong muốn và các mục ngoài phạm vi, quy tắc, giới hạn, phụ thuộc bắt buộc'
    )
  }

  const hasCompleteDeliverable = formData.brief.deliverables.some((item) =>
    isMeaningfulTaskCreateText(item.outputType) &&
    isMeaningfulTaskCreateText(item.locationOrRecipient) &&
    isMeaningfulTaskCreateText(item.minimumState)
  )
  const hasIncompleteDeliverable = formData.brief.deliverables.some((item) => {
    const values = [item.outputType, item.locationOrRecipient, item.minimumState]
    return values.some(isMeaningfulTaskCreateText) && !values.every(isMeaningfulTaskCreateText)
  })
  if (hasIncompleteDeliverable) {
    errors.brief_deliverables = translated(
      t,
      'task.validation.deliverables_incomplete',
      'Hoàn thiện hoặc xóa từng đầu ra đang điền dở'
    )
  } else if (!hasCompleteDeliverable) {
    errors.brief_deliverables = translated(
      t,
      'task.validation.deliverables_required',
      'Thêm ít nhất một đầu ra có loại, vị trí/đối tượng và trạng thái tối thiểu'
    )
  }

  const hasCompleteAcceptance = formData.brief.acceptanceCriteria.some((item) =>
    isMeaningfulTaskCreateText(item.condition) &&
    isMeaningfulTaskCreateText(item.action) &&
    isMeaningfulTaskCreateText(item.observableResult)
  )
  const hasIncompleteAcceptance = formData.brief.acceptanceCriteria.some((item) => {
    const values = [item.condition, item.action, item.observableResult]
    return values.some(isMeaningfulTaskCreateText) && !values.every(isMeaningfulTaskCreateText)
  })
  if (hasIncompleteAcceptance) {
    errors.brief_acceptance = translated(
      t,
      'task.validation.acceptance_incomplete',
      'Hoàn thiện hoặc xóa từng tiêu chí nghiệm thu đang điền dở'
    )
  } else if (!hasCompleteAcceptance) {
    errors.brief_acceptance = translated(
      t,
      'task.validation.acceptance_required',
      'Thêm ít nhất một tiêu chí có điều kiện, hành động và kết quả quan sát được'
    )
  }

  if (formData.required_skills.length === 0) {
    errors.required_skills = translated(
      t,
      'task.validation.skills_required',
      'Add at least one required skill before publishing'
    )
  } else if (formData.required_skills.some((skill) => !skill.rubric_version_id)) {
    errors.required_skills = translated(
      t,
      'task.validation.skill_rubric_required',
      'Mọi kỹ năng đã chọn phải có rubric được publish trước khi giao task'
    )
  }

  requireMeaningful(
    'verification_method',
    formData.verification_method,
    'task.validation.verification_required',
    'Select how the tester should check the expected result'
  )
  if (
    formData.reviewer_user_id &&
    formData.assigned_to &&
    formData.reviewer_user_id === formData.assigned_to
  ) {
    errors.reviewer_user_id = translated(
      t,
      'task.validation.reviewer_must_differ',
      'Tester/reviewer must be different from the assignee'
    )
  }

  if (!formData.creator_confirmed) {
    errors.creator_confirmed = translated(
      t,
      'task.create.confirmation_required',
      'Review and confirm the task contract before publishing'
    )
  }

  return errors
}

export function getFirstTaskCreateErrorField(
  errors: Record<string, string>
): TaskCreateValidationField | null {
  return (
    TASK_CREATE_VALIDATION_ORDER.find((field) => Boolean(errors[field])) ?? null
  )
}

export function getTaskCreateTabErrorCounts(
  errors: Record<string, string>
): Record<TaskCreateTab, number> {
  const counts: Record<TaskCreateTab, number> = { setup: 0, skills: 0, assignment: 0, planning: 0, contract: 0 }

  for (const field of TASK_CREATE_VALIDATION_ORDER) {
    if (errors[field]) counts[TASK_CREATE_FIELD_TAB[field]] += 1
  }

  return counts
}
