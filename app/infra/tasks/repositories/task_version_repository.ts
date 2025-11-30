/**
 * TaskVersionRepository - Barrel file
 *
 * Re-exports from write/task_version_mutations.ts
 * This file is kept for backward compatibility. New code should import from the write folder directly.
 */
import * as taskVersionMutations from './write/task_version_mutations.js'

const TaskVersionRepository = {
  ...taskVersionMutations,
}

export default TaskVersionRepository
