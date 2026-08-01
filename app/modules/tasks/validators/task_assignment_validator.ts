import {
  FieldValidationResultBuilder,
  type FieldValidationResult,
} from '#modules/tasks/validators/field_validation_result'
import { findRequiredUuidError } from '#modules/tasks/validators/string_validation'

interface TaskAssignmentInput {
  task_id?: string | null
  assignee_id?: string | null
  creator_id?: string | null
}

function findSelfAssignmentError(input: TaskAssignmentInput): string | undefined {
  const assigneeId = input.assignee_id?.trim() ?? ''
  const creatorId = input.creator_id?.trim() ?? ''

  if (creatorId && assigneeId && creatorId === assigneeId) {
    return 'Cannot assign task to yourself'
  }
  return undefined
}

export function validateTaskAssignment(
  input: TaskAssignmentInput
): FieldValidationResult<TaskAssignmentInput> {
  const result = new FieldValidationResultBuilder<TaskAssignmentInput>()

  result.add('task_id', findRequiredUuidError(input.task_id, 'Task ID'))
  result.add('assignee_id', findRequiredUuidError(input.assignee_id, 'Assignee ID'))
  result.add('assignee_id', findSelfAssignmentError(input))

  return result.build()
}
