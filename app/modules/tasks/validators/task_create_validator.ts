interface CreateTaskInput {
  title?: string | null
  description?: string | null
  project_id?: string | null
  task_status_id?: string | null
  priority?: string | null
  label?: string | null
}

interface ValidationResult {
  valid: boolean
  errors: string[]
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const VALID_PRIORITIES = new Set(['low', 'medium', 'high', 'urgent'])
const SCRIPT_PATTERN = /<script\b|<\/script>/i

function hasControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0)
    return code < 32 && code !== 9 && code !== 10 && code !== 13
  })
}

export function validateCreateTaskInput(input: CreateTaskInput): ValidationResult {
  const errors: string[] = []
  const title = input.title ?? ''
  const projectId = input.project_id?.trim() ?? ''
  const taskStatusId = input.task_status_id?.trim() ?? ''
  const description = input.description ?? ''
  const priority = input.priority?.trim() ?? ''

  if (!title.trim()) {
    errors.push('Title is required')
  } else if (title.length > 255) {
    errors.push('Title must be at most 255 characters')
  } else if (SCRIPT_PATTERN.test(title) || hasControlCharacters(title)) {
    errors.push('Title contains invalid characters')
  }

  if (!projectId) {
    errors.push('Project ID is required')
  } else if (!UUID_PATTERN.test(projectId)) {
    errors.push('Project ID must be a valid UUID')
  }

  if (!taskStatusId) {
    errors.push('Task status ID is required')
  } else if (!UUID_PATTERN.test(taskStatusId)) {
    errors.push('Task status ID must be a valid UUID')
  }

  if (description.length > 5000) {
    errors.push('Description must be at most 5000 characters')
  }

  if (priority && !VALID_PRIORITIES.has(priority)) {
    errors.push('Priority must be one of: low, medium, high, urgent')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
