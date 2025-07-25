/**
 * TaskAssignmentRepository - Barrel file
 *
 * Re-exports from read/task_assignment_queries.ts and write/task_assignment_mutations.ts
 * This file is kept for backward compatibility. New code should import from the read/write folders directly.
 */
import * as taskAssignmentQueries from './read/task_assignment_queries.js'
import * as taskAssignmentMutations from './write/task_assignment_mutations.js'

import { TaskInfraMapper } from '#infra/tasks/mapper/task_infra_mapper'
import type { TaskAssignmentWithDetailsRecord } from '#types/task_records'

const findActiveWithDetailsRecord = async (
  ...args: Parameters<typeof taskAssignmentQueries.findActiveWithDetails>
): Promise<TaskAssignmentWithDetailsRecord | null> => {
  const assignment = await taskAssignmentQueries.findActiveWithDetails(...args)
  if (!assignment) {
    return null
  }

  return TaskInfraMapper.toAssignmentWithDetailsRecord(assignment)
}

const TaskAssignmentRepository = {
  ...taskAssignmentQueries,
  ...taskAssignmentMutations,
  findActiveWithDetails: findActiveWithDetailsRecord,
}

export default TaskAssignmentRepository
