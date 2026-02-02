import {
  FieldValidationResultBuilder,
  type FieldValidationResult,
} from '#modules/tasks/validators/field_validation_result'
import { findRequiredUuidError } from '#modules/tasks/validators/string_validation'

interface CreateTaskInput {
  title?: string | null
  description?: string | null
  project_id?: string | null
  task_status_id?: string | null
  priority?: string | null
  label?: string | null
}

const VALID_PRIORITIES = new Set(['low', 'medium', 'high', 'urgent'])
const SCRIPT_PATTERN = /<script\b|<\/script>/i

function hasControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0)
    return code < 32 && code !== 9 && code !== 10 && code !== 13
  })
}

function findTitleError(title: string): string | undefined {
  if (!title.trim()) return 'Title is required'
  if (title.length > 255) return 'Title must be at most 255 characters'
  if (SCRIPT_PATTERN.test(title) || hasControlCharacters(title)) {
    return 'Title contains invalid characters'
  }
  return undefined
}

function findDescriptionError(description: string): string | undefined {
  if (description.length > 5000) return 'Description must be at most 5000 characters'
  return undefined
}

function findPriorityError(priority: string | null | undefined): string | undefined {
  const candidate = priority?.trim() ?? ''
  if (candidate && !VALID_PRIORITIES.has(candidate)) {
    return 'Priority must be one of: low, medium, high, urgent'
  }
  return undefined
}

export function validateCreateTaskInput(
  input: CreateTaskInput
): FieldValidationResult<CreateTaskInput> {
  const result = new FieldValidationResultBuilder<CreateTaskInput>()

  result.add('title', findTitleError(input.title ?? ''))
  result.add('project_id', findRequiredUuidError(input.project_id, 'Project ID'))
  result.add('task_status_id', findRequiredUuidError(input.task_status_id, 'Task status ID'))
  result.add('description', findDescriptionError(input.description ?? ''))
  result.add('priority', findPriorityError(input.priority))

  return result.build()
}
