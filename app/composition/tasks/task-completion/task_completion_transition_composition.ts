import { DomainEventTaskAssignmentCompletionEventWriterAdapter } from '#composition/adapters/events/domain_event_task_assignment_completion_event_writer_adapter'

import CompleteTaskAssignmentsCommand from '#modules/tasks/actions/commands/task-assignment/complete_task_assignments_command'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'

type TaskCompletionTransitionDependencies = Pick<TaskExternalDependencies, 'assignments' | 'review'>

const assignmentCompletionEvents = new DomainEventTaskAssignmentCompletionEventWriterAdapter()

export function makeCompleteTaskAssignmentsCommand(
  dependencies: TaskCompletionTransitionDependencies
): CompleteTaskAssignmentsCommand {
  return new CompleteTaskAssignmentsCommand(
    dependencies.assignments,
    dependencies.review,
    assignmentCompletionEvents
  )
}
