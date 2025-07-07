import vine from '@vinejs/vine'

import { taskIdRule, userIdRule } from './rules/database.js'

import { TaskStatus, TaskLabel, TaskPriority } from '#constants/task_constants'

/**
 * Validator cho tạo nhiệm vụ mới
 *
 * v3: status/label/priority are inline VARCHAR columns (no FK lookups)
 */
export const createTaskValidator = vine.create(
  vine.object({
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
)

/**
 * Validator cho payload tạo task hiện tại (snake_case)
 */
export const createTaskRequestValidator = vine.create(
  vine.object({
    title: vine.string().maxLength(255),
    description: vine.string().optional(),
    task_status_id: vine.string().uuid(),
    label: vine.enum(Object.values(TaskLabel)).optional(),
    priority: vine.enum(Object.values(TaskPriority)).optional(),
    assigned_to: userIdRule().optional(),
    due_date: vine.string().optional(),
    parent_task_id: taskIdRule().optional(),
    estimated_time: vine.number().optional(),
    actual_time: vine.number().optional(),
    project_id: vine.string().uuid(),
    required_skills: vine
      .array(
        vine.object({
          id: vine.string().uuid(),
          level: vine.string(),
        })
      )
      .optional(),
    task_type: vine.string().optional(),
    acceptance_criteria: vine.string(),
    verification_method: vine.string().optional(),
    context_background: vine.string().optional(),
    impact_scope: vine.string().optional(),
    tech_stack: vine.array(vine.string()).optional(),
    environment: vine.string().optional(),
    collaboration_type: vine.string().optional(),
    complexity_notes: vine.string().optional(),
    learning_objectives: vine.array(vine.string()).optional(),
    domain_tags: vine.array(vine.string()).optional(),
    role_in_task: vine.string().optional(),
    autonomy_level: vine.string().optional(),
    problem_category: vine.string().optional(),
    business_domain: vine.string().optional(),
    estimated_users_affected: vine.number().optional(),
  })
)

/**
 * Validator cho cập nhật nhiệm vụ
 */
export const updateTaskValidator = vine.create(
  vine.object({
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
)

/**
 * Validator cho payload cap nhat task hien tai (snake_case)
 */
export const updateTaskRequestValidator = vine.create(
  vine.object({
    title: vine.string().maxLength(255).optional(),
    description: vine.string().optional(),
    label: vine.enum(Object.values(TaskLabel)).nullable().optional(),
    priority: vine.enum(Object.values(TaskPriority)).nullable().optional(),
    assigned_to: vine.string().uuid().nullable().optional(),
    due_date: vine.string().nullable().optional(),
    parent_task_id: vine.string().uuid().nullable().optional(),
    estimated_time: vine.number().optional(),
    actual_time: vine.number().optional(),
    project_id: vine.string().uuid().optional(),
  })
)

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
export const taskFilterValidator = vine.create(
  vine.object({
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
)

/**
 * Validator cho ứng tuyển vào task
 */
export const applyForTaskValidator = vine.create(
  vine.object({
    message: vine.string().optional(),
    expected_rate: vine.number().optional(),
    portfolio_links: vine.string().optional(),
    application_source: vine.enum(['direct', 'referral', 'platform'] as const),
  })
)

/**
 * Validator cho payload ung tuyen task theo API hien tai
 */
export const applyForTaskRequestValidator = vine.create(
  vine.object({
    message: vine.string().optional(),
    expected_rate: vine.number().optional(),
    portfolio_links: vine.array(vine.string()).optional(),
    application_source: vine.enum(['public_listing', 'invitation', 'referral'] as const),
  })
)

/**
 * Validator cho xử lý đơn ứng tuyển (approve/reject)
 */
export const processApplicationValidator = vine.create(
  vine.object({
    action: vine.enum(['approve', 'reject'] as const),
    rejection_reason: vine.string().optional(),
    assignment_type: vine.enum(['salary', 'budget', 'volunteer'] as const),
    estimated_hours: vine.number().optional(),
  })
)

/**
 * Validator cho payload xu ly don ung tuyen theo API hien tai
 */
export const processApplicationRequestValidator = vine.create(
  vine.object({
    action: vine.enum(['approve', 'reject'] as const),
    rejection_reason: vine.string().optional(),
    assignment_type: vine.enum(['member', 'freelancer', 'volunteer'] as const),
    estimated_hours: vine.number().optional(),
  })
)

/**
 * Validator cho danh sách đơn ứng tuyển của task
 */
export const listTaskApplicationsValidator = vine.create(
  vine.object({
    status: vine.enum(['pending', 'approved', 'rejected', 'withdrawn'] as const).optional(),
    page: vine.number().min(1).optional(),
    per_page: vine.number().min(1).max(100).optional(),
  })
)
