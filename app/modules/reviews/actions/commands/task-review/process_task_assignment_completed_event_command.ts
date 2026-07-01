import { BaseCommand } from '#modules/reviews/actions/base_command'
import type { ReviewSessionCommandRepositoryPort } from '#modules/reviews/actions/ports/outbound/review_session_command_repository_port'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import type { TaskAssignmentCompletedEvent } from '#modules/tasks/public_contracts/task_events'

export default class ProcessTaskAssignmentCompletedEventCommand extends BaseCommand<
  TaskAssignmentCompletedEvent,
  boolean
> {
  constructor(private readonly repository: ReviewSessionCommandRepositoryPort) {
    super(makeSystemReviewActionContext('task-assignment-event'))
  }

  async handle(event: TaskAssignmentCompletedEvent): Promise<boolean> {
    const signal = event.deliveryContext?.signal
    signal?.throwIfAborted()

    const created = await this.repository.createForCompletedAssignmentIfMissing({
      assignmentId: event.assignmentId,
      assigneeId: event.assigneeId,
    })

    signal?.throwIfAborted()
    return created
  }
}
