interface TaskAssignmentInput {
  task_id?: string | null
  assignee_id?: string | null
  creator_id?: string | null
}

interface ValidationResult {
  valid: boolean
  errors: string[]
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function validateTaskAssignment(input: TaskAssignmentInput): ValidationResult {
  const errors: string[] = []
  const taskId = input.task_id?.trim() ?? ''
  const assigneeId = input.assignee_id?.trim() ?? ''
  const creatorId = input.creator_id?.trim() ?? ''

  if (!taskId) {
    errors.push('Task ID is required')
  } else if (!UUID_PATTERN.test(taskId)) {
    errors.push('Task ID must be a valid UUID')
  }

  if (!assigneeId) {
    errors.push('Assignee ID is required')
  } else if (!UUID_PATTERN.test(assigneeId)) {
    errors.push('Assignee ID must be a valid UUID')
  }

  if (creatorId && assigneeId && creatorId === assigneeId) {
    errors.push('Cannot assign task to yourself')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
