import type {
  OrganizationCreatedEvent,
  OrganizationDeletedEvent,
  OrganizationMemberAddedEvent,
  OrganizationMemberApprovedEvent,
  OrganizationMemberRemovedEvent,
  OrganizationMemberRoleChangedEvent,
  OrganizationUpdatedEvent,
} from '#modules/organizations/public_contracts/directory/organization_events'

export abstract class OrganizationEventPublisher {
  abstract publishOrganizationCreated(event: OrganizationCreatedEvent): Promise<void>
  abstract publishOrganizationUpdated(event: OrganizationUpdatedEvent): Promise<void>
  abstract publishOrganizationDeleted(event: OrganizationDeletedEvent): Promise<void>
  abstract publishOrganizationMemberAdded(event: OrganizationMemberAddedEvent): Promise<void>
  abstract publishOrganizationMemberRemoved(event: OrganizationMemberRemovedEvent): Promise<void>
  abstract publishOrganizationMemberRoleChanged(
    event: OrganizationMemberRoleChangedEvent
  ): Promise<void>
  abstract publishOrganizationMemberApproved(
    event: OrganizationMemberApprovedEvent
  ): Promise<void>
}
