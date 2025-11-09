import type {
  ProjectMemberAddedEvent,
  ProjectCreatedEvent,
  ProjectDeletedEvent,
  ProjectMemberRemovedEvent,
  ProjectUpdatedEvent,
} from '#modules/projects/events/project_events'

export interface ProjectEventPublisher {
  publishProjectCreated(event: ProjectCreatedEvent): Promise<void>
  publishProjectUpdated(event: ProjectUpdatedEvent): Promise<void>
  publishProjectDeleted(event: ProjectDeletedEvent): Promise<void>
  publishProjectMemberAdded(event: ProjectMemberAddedEvent): Promise<void>
  publishProjectMemberRemoved(event: ProjectMemberRemovedEvent): Promise<void>
}
