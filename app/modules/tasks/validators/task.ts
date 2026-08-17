import vine from '@vinejs/vine'

import {
  APPLICATION_SOURCE_VALUES,
  APPLICATION_STATUS_VALUES,
  ASSIGNMENT_TYPE_VALUES,
  TaskLabel,
  TaskPriority,
  TaskStatus,
  TaskVisibility,
} from '#modules/tasks/public_contracts/task_constants'
import { taskIdRule, userIdRule } from '#modules/tasks/validators/rules/database'

const DISALLOWED_CONTROL_CHARACTERS_REGEX = new RegExp(
  String.raw`^(?!.*[\x00-\x08\x0B\x0C\x0E-\x1F]).*$`
)
const SCRIPT_OPENING_TAG_REGEX = /<script\b[^>]*>/gi
const SCRIPT_CLOSING_TAG_REGEX = /<\/script>/gi

function stripScriptTags(value: string): string {
  return value.replace(SCRIPT_OPENING_TAG_REGEX, '').replace(SCRIPT_CLOSING_TAG_REGEX, '')
}

function taskTitleRule() {
  return vine
    .string()
    .maxLength(255)
    .regex(DISALLOWED_CONTROL_CHARACTERS_REGEX)
    .transform(stripScriptTags)
}

function requiredSkillRule() {
  return vine.object({
    // Legacy fields (backward compatible)
    id: vine.string(),
    level: vine.string().optional(),
    custom_name: vine.string().optional(),
    category_code: vine.string().optional(),
    // Semantic fields
    project_skill_id: vine.string().uuid().optional(),
    source_project_professional_role_id: vine.string().uuid().optional(),
    source_role_skill_id: vine.string().uuid().optional(),
    minimum_level_id: vine.string().uuid().optional(),
    target_level_id: vine.string().uuid().optional(),
    assessment_ceiling_level_id: vine.string().uuid().optional(),
    rubric_version_id: vine.string().uuid().optional(),
    importance: vine.string().optional(),
    weight: vine.number().optional(),
    requirement_source: vine.string().optional(),
    requirement_notes: vine.string().optional(),
    is_mandatory: vine.boolean().optional(),
  })
}

function legacyTaskSchema() {
  return vine.object({
    title: vine.string().maxLength(255),
    description: vine.string().optional(),
    status: vine.enum(Object.values(TaskStatus)),
    label: vine.enum(Object.values(TaskLabel)).optional(),
    priority: vine.enum(Object.values(TaskPriority)).optional(),
    assignedTo: userIdRule().optional(),
    dueDate: vine.date().optional(),
    parentTaskId: taskIdRule().optional(),
    estimatedTime: vine.number().optional(),
    actualTime: vine.number().optional(),
  })
}

function taskContextRules() {
  return {
    context_background: vine.string().optional(),
    impact_scope: vine.string().optional(),
    tech_stack: vine.array(vine.string()).optional(),
    environment: vine.string().optional(),
    collaboration_type: vine.string().optional(),
    complexity_notes: vine.string().optional(),
  }
}

function taskClassificationRules() {
  return {
    learning_objectives: vine.array(vine.string()).optional(),
    domain_tags: vine.array(vine.string()).optional(),
    role_in_task: vine.string().optional(),
    autonomy_level: vine.string().optional(),
    problem_category: vine.string().optional(),
    business_domain: vine.string().optional(),
    estimated_users_affected: vine.number().optional(),
  }
}

function createTaskRequestSchema() {
  return vine.object({
    title: taskTitleRule(),
    description: vine.string().optional(),
    task_status_id: vine.string().uuid(),
    label: vine.enum(Object.values(TaskLabel)).optional(),
    priority: vine.enum(Object.values(TaskPriority)).optional(),
    task_visibility: vine.enum(Object.values(TaskVisibility)).optional(),
    assigned_to: userIdRule().optional(),
    due_date: vine.string().optional(),
    parent_task_id: taskIdRule().optional(),
    estimated_time: vine.number().optional(),
    actual_time: vine.number().optional(),
    project_id: vine.string().uuid(),
    required_skills: vine.array(requiredSkillRule()).optional(),
    task_type: vine.string().optional(),
    acceptance_criteria: vine.string().optional(),
    verification_method: vine.string().optional(),
    ...taskContextRules(),
    ...taskClassificationRules(),
  })
}

function updateTaskRequestSchema() {
  return vine.object({
    title: taskTitleRule().optional(),
    description: vine.string().optional(),
    label: vine.enum(Object.values(TaskLabel)).nullable().optional(),
    priority: vine.enum(Object.values(TaskPriority)).nullable().optional(),
    task_visibility: vine.enum(Object.values(TaskVisibility)).optional(),
    assigned_to: vine.string().uuid().nullable().optional(),
    due_date: vine.string().nullable().optional(),
    parent_task_id: vine.string().uuid().nullable().optional(),
    estimated_time: vine.number().optional(),
    actual_time: vine.number().optional(),
    project_id: vine.string().uuid().optional(),
    expected_updated_at: vine.string().optional(),
    task_type: vine.string().optional(),
    acceptance_criteria: vine.string().optional(),
    verification_method: vine.string().optional(),
    ...taskContextRules(),
    ...taskClassificationRules(),
  })
}

function taskFilterSchema() {
  return vine.object({
    search: vine.string().optional(),
    status: vine.enum(Object.values(TaskStatus)).optional(),
    priority: vine.enum(Object.values(TaskPriority)).optional(),
    label: vine.enum(Object.values(TaskLabel)).optional(),
    assignedTo: vine.string().uuid().optional(),
    myTasks: vine.boolean().optional(),
    parentTaskId: vine.string().uuid().optional(),
    page: vine.number().optional(),
    limit: vine.number().optional(),
  })
}

function legacyApplicationSchema() {
  return vine.object({
    message: vine.string().optional(),
    portfolio_links: vine.string().optional(),
    application_source: vine.enum(['direct', 'referral', 'platform'] as const),
  })
}

function applicationDecisionSchema<const AssignmentTypes extends readonly unknown[]>(
  assignmentTypes: AssignmentTypes
) {
  return vine.object({
    action: vine.enum(['approve', 'reject'] as const),
    rejection_reason: vine.string().optional(),
    assignment_type: vine.enum(assignmentTypes),
    estimated_hours: vine.number().optional(),
  })
}

/**
 * Validator cho tạo nhiệm vụ mới
 *
 * v3: status/label/priority are inline VARCHAR columns (no FK lookups)
 */
export const createTaskValidator = vine.create(legacyTaskSchema())

/**
 * Validator cho payload tạo task hiện tại (snake_case)
 */
export const createTaskRequestValidator = vine.create(createTaskRequestSchema())

/**
 * Validator cho cập nhật nhiệm vụ
 */
export const updateTaskValidator = vine.create(legacyTaskSchema())

/**
 * Validator cho payload cap nhat task hien tai (snake_case)
 */
export const updateTaskRequestValidator = vine.create(updateTaskRequestSchema())

/**
 * Validator cho cập nhật trạng thái nhiệm vụ
 */
export const updateTaskStatusValidator = vine.create(
  vine.object({
    status: vine.enum(Object.values(TaskStatus)),
  })
)

/**
 * Validator cho cập nhật thời gian thực tế
 */
export const updateTaskTimeValidator = vine.create(
  vine.object({
    actualTime: vine.number(),
  })
)

/**
 * Validator cho các mẫu lọc nhiệm vụ
 */
export const taskFilterValidator = vine.create(taskFilterSchema())

/**
 * Validator cho đề xuất tham gia task
 */
export const applyForTaskValidator = vine.create(legacyApplicationSchema())

/**
 * Validator cho payload gửi đề xuất tham gia task theo API hien tai
 */
export const applyForTaskRequestValidator = vine.create(
  vine.object({
    message: vine.string().optional(),
    portfolio_links: vine.array(vine.string()).optional(),
    application_source: vine.enum(APPLICATION_SOURCE_VALUES),
  })
)

/**
 * Validator cho xử lý đề xuất tham gia (approve/reject)
 */
export const processApplicationValidator = vine.create(
  applicationDecisionSchema(['member', 'external_contributor', 'volunteer'] as const)
)

/**
 * Validator cho payload xu ly don tham gia theo API hien tai
 */
export const processApplicationRequestValidator = vine.create(
  applicationDecisionSchema(ASSIGNMENT_TYPE_VALUES)
)

/**
 * Validator cho danh sách đề xuất tham gia của task
 */
export const listTaskApplicationsValidator = vine.create(
  vine.object({
    status: vine.enum(APPLICATION_STATUS_VALUES).optional(),
    page: vine.number().min(1).optional(),
    per_page: vine.number().min(1).max(100).optional(),
  })
)
