export interface OrganizationMembershipApprovedV1 {
  eventType: 'organizations.membership_approved.v1'
  organizationId: string
  userId: string
  approvedByUserId: string
  approvedAt: string
}

export interface OrganizationMemberRemovedV1 {
  eventType: 'organizations.member_removed.v1'
  organizationId: string
  removedUserId: string
  removedByUserId: string
  removedAt: string
}

export interface OrganizationRoleChangedV1 {
  eventType: 'organizations.role_changed.v1'
  organizationId: string
  userId: string
  oldRole: string | null
  newRole: string
  changedByUserId: string
  changedAt: string
}
