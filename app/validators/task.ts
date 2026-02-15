import vine from '@vinejs/vine'
import { lookupIdRule, taskIdRule, userIdRule } from './rules/database.js'

/**
 * Validator cho tạo nhiệm vụ mới
 *
 * ID fields use UUID + existsInTable referential checks
 * (replaces MySQL FK constraints)
 */
export const createTaskValidator = vine.create(
  vine.object({
    title: vine.string().maxLength(255),
    description: vine.string().optional(),
    statusId: lookupIdRule('task_status'),
    labelId: lookupIdRule('task_labels').optional(),
    priorityId: lookupIdRule('task_priorities').optional(),
    assignedTo: userIdRule().optional(),
    dueDate: vine.date().optional(),
    parentTaskId: taskIdRule().optional(),
    estimatedTime: vine.number().optional(),
    actualTime: vine.number().optional(),
  })
)

/**
 * Validator cho cập nhật nhiệm vụ
 */
export const updateTaskValidator = vine.create(
  vine.object({
    title: vine.string().maxLength(255),
    description: vine.string().optional(),
    statusId: lookupIdRule('task_status'),
    labelId: lookupIdRule('task_labels').optional(),
    priorityId: lookupIdRule('task_priorities').optional(),
    assignedTo: userIdRule().optional(),
    dueDate: vine.date().optional(),
    parentTaskId: taskIdRule().optional(),
    estimatedTime: vine.number().optional(),
    actualTime: vine.number().optional(),
  })
)

/**
 * Validator cho cập nhật trạng thái nhiệm vụ
 */
export const updateTaskStatusValidator = vine.create(
  vine.object({
    statusId: lookupIdRule('task_status'),
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
    status: vine.string().uuid().optional(),
    priority: vine.string().uuid().optional(),
    label: vine.string().uuid().optional(),
    assignedTo: vine.string().uuid().optional(),
    myTasks: vine.boolean().optional(),
    parentTaskId: vine.string().uuid().optional(),
    page: vine.number().optional(),
    limit: vine.number().optional(),
  })
)
