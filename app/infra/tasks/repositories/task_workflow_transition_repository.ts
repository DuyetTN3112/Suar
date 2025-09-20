/**
 * TaskWorkflowTransitionRepository - Barrel file
 *
 * Re-exports from read/task_workflow_transition_queries.ts and write/task_workflow_transition_mutations.ts
 * This file is kept for backward compatibility. New code should import from the read/write folders directly.
 */
import * as taskWorkflowTransitionQueries from './read/task_workflow_transition_queries.js'
import * as taskWorkflowTransitionMutations from './write/task_workflow_transition_mutations.js'

const TaskWorkflowTransitionRepository = {
  ...taskWorkflowTransitionQueries,
  ...taskWorkflowTransitionMutations,
}

export default TaskWorkflowTransitionRepository
