import type { ProjectTransaction } from './project_transaction.js'

export interface ProjectOrganizationAccessSnapshot {
  organizationId: string
  actorUserId: string
  actorOrganizationRole: string | null
  actorMembershipStatus: string | null
}

export interface ProjectOrganizationAccessReader {
  findOrganizationAccess(
    params: {
      organizationId: string
      actorUserId: string
    },
    transaction?: ProjectTransaction
  ): Promise<ProjectOrganizationAccessSnapshot | null>

  ensureApprovedMember(
    organizationId: string,
    actorUserId: string,
    transaction?: ProjectTransaction
  ): Promise<void>
}
