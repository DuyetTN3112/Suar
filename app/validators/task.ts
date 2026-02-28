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
