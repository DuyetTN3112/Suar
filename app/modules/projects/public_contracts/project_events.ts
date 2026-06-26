import type {
  DurableDomainEventDeliveryContext,
  ProjectContextChangedOutboxPayload,
  WorkPackageChangedOutboxPayload,
} from '#modules/events/public_contracts/domain_event_outbox'

export interface ProjectCreatedEvent {
  projectId: string
  creatorId: string
  organizationId: string
  name: string
}

export interface ProjectUpdatedEvent {
  projectId: string
  updatedBy: string
  changes: Record<string, unknown>
}

export interface ProjectDeletedEvent {
  projectId: string
  organizationId: string
  deletedBy: string
}

export interface ProjectMemberAddedEvent {
  projectId: string
  userId: string
  project_role: string
  addedBy: string
}

export interface ProjectMemberRemovedEvent {
  projectId: string
  userId: string
  removedBy: string
}

export interface ProjectOwnershipTransferredEvent {
  projectId: string
  fromUserId: string
  toUserId: string
  transferredBy: string
}

export interface ProjectContextChangedEvent extends ProjectContextChangedOutboxPayload {
  deliveryContext?: DurableDomainEventDeliveryContext
}

export interface WorkPackageChangedEvent extends WorkPackageChangedOutboxPayload {
  deliveryContext?: DurableDomainEventDeliveryContext
}

declare module '@adonisjs/core/types' {
  interface EventsList {
    'project:created': ProjectCreatedEvent
    'project:updated': ProjectUpdatedEvent
    'project:deleted': ProjectDeletedEvent
    'project:member:added': ProjectMemberAddedEvent
    'project:member:removed': ProjectMemberRemovedEvent
    'project:ownership:transferred': ProjectOwnershipTransferredEvent
    'project:context:changed:v1': ProjectContextChangedEvent
    'project:work-package:changed:v1': WorkPackageChangedEvent
  }
}
