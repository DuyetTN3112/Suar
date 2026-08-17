/**
 * TaskAssignmentRepository - Barrel file
 *
 * Re-exports from read/task_assignment_queries.ts and write/task_assignment_mutations.ts
 * This file is kept for backward compatibility. New code should import from the read/write folders directly.
 */
import * as taskAssignmentQueries from './read/task_assignment_queries.js'
import * as taskAssignmentMutations from './write/task_assignment_mutations.js'

import { TaskInfraMapper } from '#modules/tasks/infra/adapters/task-authoring/task_infra_mapper'
import type { TaskAssignmentWithTaskRecord } from '#modules/tasks/types/task_records'

const findWithTaskForUpdateRecord = async (
  ...args: Parameters<typeof taskAssignmentQueries.findWithTaskForUpdate>
): Promise<TaskAssignmentWithTaskRecord | null> => {
  const assignment = await taskAssignmentQueries.findWithTaskForUpdate(...args)
  if (!assignment) {
    return null
  }

  return TaskInfraMapper.toAssignmentWithTaskRecord(assignment)
}

const TaskAssignmentRepository = {
  ...taskAssignmentQueries,
  ...taskAssignmentMutations,
  findWithTaskForUpdate: findWithTaskForUpdateRecord,
}

export default TaskAssignmentRepository
