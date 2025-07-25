import { completeActiveAssignmentsForCompletedTask } from './task_assignment_mutations.js'

import type { TaskAssignmentCommandRepositoryPort } from '#actions/tasks/ports/task_assignment_command_repository_port'


export const taskAssignmentCommandRepository: TaskAssignmentCommandRepositoryPort = {
  completeActiveAssignmentsForCompletedTask,
}

