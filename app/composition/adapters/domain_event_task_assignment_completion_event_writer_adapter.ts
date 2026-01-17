import {
  stageDomainEvent,
  type StageDomainEventInput,
  type StageDomainEventResult,
} from '#modules/events/public_contracts/domain_event_outbox'
import type {
  TaskAssignmentCompletionEvent,
  TaskAssignmentCompletionEventWriter,
} from '#modules/tasks/actions/ports/outbound/task_assignment_completion_event_writer'
import type { TaskTransaction } from '#modules/tasks/actions/ports/outbound/task_transaction'

type TaskAssignmentCompletedStageInput = Extract<
  StageDomainEventInput,
  { eventName: 'task:assignment:completed' }
>

type DomainEventStage = (
  transaction: object,
  input: TaskAssignmentCompletedStageInput
) => Promise<StageDomainEventResult>

export class DomainEventTaskAssignmentCompletionEventWriterAdapter implements TaskAssignmentCompletionEventWriter {
  constructor(private readonly stageDomain: DomainEventStage = stageDomainEvent) {}

  async stage(event: TaskAssignmentCompletionEvent, transaction: TaskTransaction): Promise<void> {
    await this.stageDomain(transaction, {
      eventName: 'task:assignment:completed',
      dedupeKey: `task-assignment-completed:${event.assignmentId}`,
      aggregateType: 'task_assignment',
      aggregateId: event.assignmentId,
      payload: event,
    })
  }
}
