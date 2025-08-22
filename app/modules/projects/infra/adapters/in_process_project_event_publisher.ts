import emitter from '@adonisjs/core/services/emitter'

import type { ProjectEventPublisher } from '#modules/projects/application/ports/project_event_publisher'
import type {
  ProjectMemberAddedEvent,
  ProjectCreatedEvent,
  ProjectDeletedEvent,
  ProjectMemberRemovedEvent,
  ProjectUpdatedEvent,
} from '#modules/projects/events/project_events'

export class InProcessProjectEventPublisher implements ProjectEventPublisher {
  async publishProjectCreated(event: ProjectCreatedEvent): Promise<void> {
    await emitter.emit('project:created', event)
  }

  async publishProjectUpdated(event: ProjectUpdatedEvent): Promise<void> {
    await emitter.emit('project:updated', event)
  }

  async publishProjectDeleted(event: ProjectDeletedEvent): Promise<void> {
    await emitter.emit('project:deleted', event)
  }

  async publishProjectMemberAdded(event: ProjectMemberAddedEvent): Promise<void> {
    await emitter.emit('project:member:added', event)
  }

  async publishProjectMemberRemoved(event: ProjectMemberRemovedEvent): Promise<void> {
    await emitter.emit('project:member:removed', event)
  }
}
