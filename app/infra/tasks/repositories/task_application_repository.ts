/**
 * TaskApplicationRepository - Barrel file
 *
 * Re-exports from read/task_application_queries.ts and write/task_application_mutations.ts
 * This file is kept for backward compatibility. New code should import from the read/write folders directly.
 */
import * as taskApplicationQueries from './read/task_application_queries.js'
import * as taskApplicationMutations from './write/task_application_mutations.js'

const TaskApplicationRepository = {
  ...taskApplicationQueries,
  ...taskApplicationMutations,
}

export default TaskApplicationRepository
