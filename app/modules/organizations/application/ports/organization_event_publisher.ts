import type {
  OrganizationCreatedEvent,
  OrganizationDeletedEvent,
  OrganizationMemberAddedEvent,
  OrganizationMemberApprovedEvent,
  OrganizationMemberRemovedEvent,
  OrganizationMemberRoleChangedEvent,
  OrganizationUpdatedEvent,
} from '#modules/organizations/events/organization_events'

export interface OrganizationEventPublisher {
  publishOrganizationCreated(event: OrganizationCreatedEvent): Promise<void>
  publishOrganizationUpdated(event: OrganizationUpdatedEvent): Promise<void>
  publishOrganizationDeleted(event: OrganizationDeletedEvent): Promise<void>
  publishOrganizationMemberAdded(event: OrganizationMemberAddedEvent): Promise<void>
  publishOrganizationMemberRemoved(event: OrganizationMemberRemovedEvent): Promise<void>
  publishOrganizationMemberRoleChanged(
    event: OrganizationMemberRoleChangedEvent
  ): Promise<void>
  publishOrganizationMemberApproved(event: OrganizationMemberApprovedEvent): Promise<void>
}
