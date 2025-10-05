import type {
  TaskAccessRevokedEvent,
  TaskApplicationReviewedEvent,
  TaskApplicationSubmittedEvent,
  TaskAssignedEvent,
  TaskAssignmentCompletedEvent,
  TaskCreatedEvent,
  TaskDeletedEvent,
  TaskStatusChangedEvent,
  TaskUpdatedEvent,
} from '#modules/tasks/events/task_events'

export interface TaskEventPublisher {
  publishTaskCreated(event: TaskCreatedEvent): Promise<void>
  publishTaskUpdated(event: TaskUpdatedEvent): Promise<void>
  publishTaskDeleted(event: TaskDeletedEvent): Promise<void>
  publishTaskStatusChanged(event: TaskStatusChangedEvent): Promise<void>
  publishTaskAssignmentCompleted(event: TaskAssignmentCompletedEvent): Promise<void>
  publishTaskAssigned(event: TaskAssignedEvent): Promise<void>
  publishTaskAccessRevoked(event: TaskAccessRevokedEvent): Promise<void>
  publishTaskApplicationSubmitted(event: TaskApplicationSubmittedEvent): Promise<void>
  publishTaskApplicationReviewed(event: TaskApplicationReviewedEvent): Promise<void>
}
