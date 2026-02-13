import type { TaskAssignmentCompletionEventWriter } from '#modules/tasks/actions/ports/outbound/task_assignment_completion_event_writer'
import type { TaskAssignmentRepository } from '#modules/tasks/actions/ports/outbound/task_assignment_repository'
import type { TaskReviewReader } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'

export interface CompleteTaskAssignmentsInput {
  taskId: string
  assignedTo: string | null
  changedBy: string
}

/**
 * Transaction-bound subordinate use case for the transition to DONE.
 *
 * The parent status command owns the transaction boundary and decides when
 * completion is required. This command owns the ordered mutation:
 * assignments -> review workflow -> durable completion events.
 */
export default class CompleteTaskAssignmentsCommand {
  constructor(
    private readonly assignments: TaskAssignmentRepository,
    private readonly reviews: TaskReviewReader,
    private readonly completionEvents: TaskAssignmentCompletionEventWriter
  ) {}

  async execute(input: CompleteTaskAssignmentsInput, transaction: TaskTransaction): Promise<void> {
    const assignments = await this.assignments.completeActiveForTask(input, transaction)
    await this.reviews.ensureTaskReviewWorkflow(input.taskId, input.changedBy, transaction)

    for (const assignment of assignments) {
      await this.completionEvents.stage(
        {
          taskId: input.taskId,
          assignmentId: assignment.id,
          assigneeId: assignment.assignee_id,
        },
        transaction
      )
    }
  }
}
