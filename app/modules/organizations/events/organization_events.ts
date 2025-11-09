
export interface OrganizationCreatedEvent {
  organizationId: string
  ownerId: string
  name: string
  slug: string
  ip?: string
}

export interface OrganizationUpdatedEvent {
  organizationId: string
  updatedBy: string
  changes: Record<string, unknown>
}

export interface OrganizationDeletedEvent {
  organizationId: string
  deletedBy: string
}

export interface OrganizationMemberAddedEvent {
  organizationId: string
  userId: string
  org_role: string
  invitedBy: string | null
}

export interface OrganizationMemberRemovedEvent {
  organizationId: string
  userId: string
  removedBy: string
}

export interface OrganizationMemberRoleChangedEvent {
  organizationId: string
  userId: string
  oldRole: string
  newRole: string
  changedBy: string
}

export interface OrganizationMemberApprovedEvent {
  organizationId: string
  userId: string
  orgRole: string
  approvedBy: string
}

declare module '@adonisjs/core/types' {
  interface EventsList {
    'organization:created': OrganizationCreatedEvent
    'organization:updated': OrganizationUpdatedEvent
    'organization:deleted': OrganizationDeletedEvent
    'organization:member:added': OrganizationMemberAddedEvent
    'organization:member:removed': OrganizationMemberRemovedEvent
    'organization:member:role_changed': OrganizationMemberRoleChangedEvent
    'organization:member:approved': OrganizationMemberApprovedEvent
  }
}
