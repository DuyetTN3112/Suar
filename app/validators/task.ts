import vine from '@vinejs/vine'

/**
 * Validator cho tạo nhiệm vụ mới
 */
export const createTaskValidator = vine.compile(
  vine.object({
    title: vine.string().maxLength(255),
    description: vine.string().optional(),
    statusId: vine.number(),
    labelId: vine.number().optional(),
    priorityId: vine.number().optional(),
    assignedTo: vine.number().optional(),
    dueDate: vine.date().optional(),
    parentTaskId: vine.string().optional(),
    estimatedTime: vine.number().optional(),
    actualTime: vine.number().optional(),
  })
)

/**
 * Validator cho cập nhật nhiệm vụ
 */
export const updateTaskValidator = vine.compile(
  vine.object({
    title: vine.string().maxLength(255),
    description: vine.string().optional(),
    statusId: vine.number(),
    labelId: vine.number().optional(),
    priorityId: vine.number().optional(),
    assignedTo: vine.number().optional(),
    dueDate: vine.date().optional(),
    parentTaskId: vine.string().optional(),
    estimatedTime: vine.number().optional(),
    actualTime: vine.number().optional(),
  })
)

/**
 * Validator cho cập nhật trạng thái nhiệm vụ
 */
export const updateTaskStatusValidator = vine.compile(
  vine.object({
    statusId: vine.number(),
  })
)

/**
 * Validator cho cập nhật thời gian thực tế
 */
export const updateTaskTimeValidator = vine.compile(
  vine.object({
    actualTime: vine.number(),
  })
)

/**
 * Validator cho các mẫu lọc nhiệm vụ
 */
export const taskFilterValidator = vine.compile(
  vine.object({
    search: vine.string().optional(),
    status: vine.number().optional(),
    priority: vine.number().optional(),
    label: vine.number().optional(),
    assignedTo: vine.number().optional(),
    myTasks: vine.boolean().optional(),
    parentTaskId: vine.string().optional(),
    page: vine.number().optional(),
    limit: vine.number().optional(),
  })
)
