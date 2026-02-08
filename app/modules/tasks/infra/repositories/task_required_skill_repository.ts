/**
 * TaskRequiredSkillRepository - Barrel file
 *
 * Re-exports from write/task_required_skill_mutations.ts
 * This file is kept for backward compatibility. New code should import from the write folder directly.
 */
import * as taskRequiredSkillMutations from './write/task_required_skill_mutations.js'

const TaskRequiredSkillRepository = {
  ...taskRequiredSkillMutations,
}

export default TaskRequiredSkillRepository
