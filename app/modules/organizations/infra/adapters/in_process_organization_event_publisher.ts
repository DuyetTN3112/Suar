import emitter from '@adonisjs/core/services/emitter'

import type { OrganizationEventPublisher } from '#modules/organizations/application/ports/organization_event_publisher'
import type {
  OrganizationCreatedEvent,
  OrganizationDeletedEvent,
  OrganizationMemberAddedEvent,
  OrganizationMemberApprovedEvent,
  OrganizationMemberRemovedEvent,
  OrganizationMemberRoleChangedEvent,
  OrganizationUpdatedEvent,
} from '#modules/organizations/events/organization_events'

export class InProcessOrganizationEventPublisher implements OrganizationEventPublisher {
  async publishOrganizationCreated(event: OrganizationCreatedEvent): Promise<void> {
    await emitter.emit('organization:created', event)
  }

  async publishOrganizationUpdated(event: OrganizationUpdatedEvent): Promise<void> {
    await emitter.emit('organization:updated', event)
  }

  async publishOrganizationDeleted(event: OrganizationDeletedEvent): Promise<void> {
    await emitter.emit('organization:deleted', event)
  }

  async publishOrganizationMemberAdded(event: OrganizationMemberAddedEvent): Promise<void> {
    await emitter.emit('organization:member:added', event)
  }

  async publishOrganizationMemberRemoved(event: OrganizationMemberRemovedEvent): Promise<void> {
    await emitter.emit('organization:member:removed', event)
  }

  async publishOrganizationMemberRoleChanged(
    event: OrganizationMemberRoleChangedEvent
  ): Promise<void> {
    await emitter.emit('organization:member:role_changed', event)
  }

  async publishOrganizationMemberApproved(event: OrganizationMemberApprovedEvent): Promise<void> {
    await emitter.emit('organization:member:approved', event)
  }
}
