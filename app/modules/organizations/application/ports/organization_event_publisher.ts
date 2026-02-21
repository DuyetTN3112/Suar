import type {
  OrganizationMemberRemovedV1,
  OrganizationMembershipApprovedV1,
  OrganizationRoleChangedV1,
} from '#modules/organizations/public_contracts/organization_events_v1'

export type OrganizationPublicEventV1 =
  | OrganizationMembershipApprovedV1
  | OrganizationMemberRemovedV1
  | OrganizationRoleChangedV1

export interface OrganizationEventPublisher {
  publish(event: OrganizationPublicEventV1): Promise<void>
}
