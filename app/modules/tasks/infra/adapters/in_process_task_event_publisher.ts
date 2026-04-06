import emitter from '@adonisjs/core/services/emitter'

import type { TaskEventPublisher } from '#modules/tasks/application/ports/task_event_publisher'
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

export class InProcessTaskEventPublisher implements TaskEventPublisher {
  async publishTaskCreated(event: TaskCreatedEvent): Promise<void> {
    await emitter.emit('task:created', event)
  }

  async publishTaskUpdated(event: TaskUpdatedEvent): Promise<void> {
    await emitter.emit('task:updated', event)
  }

  async publishTaskDeleted(event: TaskDeletedEvent): Promise<void> {
    await emitter.emit('task:deleted', event)
  }

  async publishTaskStatusChanged(event: TaskStatusChangedEvent): Promise<void> {
    await emitter.emit('task:status:changed', event)
  }

  async publishTaskAssignmentCompleted(event: TaskAssignmentCompletedEvent): Promise<void> {
    await emitter.emit('task:assignment:completed', event)
  }

  async publishTaskAssigned(event: TaskAssignedEvent): Promise<void> {
    await emitter.emit('task:assigned', event)
  }

  async publishTaskAccessRevoked(event: TaskAccessRevokedEvent): Promise<void> {
    await emitter.emit('task:access:revoked', event)
  }

  async publishTaskApplicationSubmitted(event: TaskApplicationSubmittedEvent): Promise<void> {
    await emitter.emit('task:application:submitted', event)
  }

  async publishTaskApplicationReviewed(event: TaskApplicationReviewedEvent): Promise<void> {
    await emitter.emit('task:application:reviewed', event)
  }
}
