import vine from '@vinejs/vine'

import { TaskStatusCategory } from '#modules/tasks/public_contracts/task_constants'

const TASK_STATUS_CATEGORIES = Object.values(TaskStatusCategory) as string[]

function taskStatusNameRule() {
  return vine.string().maxLength(50)
}

function taskStatusSlugRule() {
  return vine
    .string()
    .maxLength(50)
    .regex(/^[a-z0-9_]+$/)
}

function taskStatusCategoryRule() {
  return vine.enum(TASK_STATUS_CATEGORIES)
}

function taskStatusColorRule() {
  return vine
    .string()
    .maxLength(7)
    .regex(/^#[0-9a-fA-F]{6}$/)
}

function taskStatusIconRule() {
  return vine.string().maxLength(50)
}

function taskStatusDescriptionRule() {
  return vine.string().maxLength(255)
}

function taskStatusSortOrderRule() {
  return vine.number().min(0)
}

function workflowTransitionSchema() {
  return vine.object({
    from_status_id: vine.string().uuid(),
    to_status_id: vine.string().uuid(),
    conditions: vine
      .object({
        requires_assignee: vine.boolean().optional(),
      })
      .optional(),
  })
}

/**
 * Validator for creating a new task status.
 * POST /api/task-statuses
 */
export const createTaskStatusValidator = vine.create(
  vine.object({
    name: taskStatusNameRule(),
    slug: taskStatusSlugRule(),
    category: taskStatusCategoryRule(),
    color: taskStatusColorRule().optional(),
    icon: taskStatusIconRule().optional(),
    description: taskStatusDescriptionRule().optional(),
    sort_order: taskStatusSortOrderRule().optional(),
  })
)

/**
 * Validator for updating a task status definition.
 * PUT|PATCH /api/task-statuses/:taskStatusId
 */
export const updateTaskStatusValidator = vine.create(
  vine.object({
    name: taskStatusNameRule().optional(),
    slug: taskStatusSlugRule().optional(),
    category: taskStatusCategoryRule().optional(),
    color: taskStatusColorRule().optional(),
    icon: taskStatusIconRule().nullable().optional(),
    description: taskStatusDescriptionRule().nullable().optional(),
    sort_order: taskStatusSortOrderRule().optional(),
    is_default: vine.boolean().optional(),
  })
)

/**
 * Validator for updating the entire workflow.
 * PUT /api/workflow
 */
export const updateWorkflowValidator = vine.create(
  vine.object({
    transitions: vine.array(workflowTransitionSchema()),
  })
)
