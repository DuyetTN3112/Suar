import vine from '@vinejs/vine'

import { TaskStatusCategory } from '#constants/task_constants'

const TASK_STATUS_CATEGORIES = Object.values(TaskStatusCategory) as string[]

/**
 * Validator for creating a new task status.
 * POST /api/task-statuses
 */
export const createTaskStatusValidator = vine.create(
  vine.object({
    name: vine.string().maxLength(50),
    slug: vine
      .string()
      .maxLength(50)
      .regex(/^[a-z0-9_]+$/),
    category: vine.enum(TASK_STATUS_CATEGORIES),
    color: vine
      .string()
      .maxLength(7)
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    icon: vine.string().maxLength(50).optional(),
    description: vine.string().maxLength(255).optional(),
    sort_order: vine.number().min(0).optional(),
  })
)

/**
 * Validator for updating a task status definition.
 * PUT /api/task-statuses/:id
 */
export const updateTaskStatusValidator = vine.create(
  vine.object({
    name: vine.string().maxLength(50).optional(),
    slug: vine
      .string()
      .maxLength(50)
      .regex(/^[a-z0-9_]+$/)
      .optional(),
    category: vine.enum(TASK_STATUS_CATEGORIES).optional(),
    color: vine
      .string()
      .maxLength(7)
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    icon: vine.string().maxLength(50).nullable().optional(),
    description: vine.string().maxLength(255).nullable().optional(),
    sort_order: vine.number().min(0).optional(),
    is_default: vine.boolean().optional(),
  })
)

/**
 * Validator for updating the entire workflow.
 * PUT /api/workflow
 */
export const updateWorkflowValidator = vine.create(
  vine.object({
    transitions: vine.array(
      vine.object({
        from_status_id: vine.string().uuid(),
        to_status_id: vine.string().uuid(),
        conditions: vine
          .object({
            requires_assignee: vine.boolean().optional(),
          })
          .optional(),
      })
    ),
  })
)
