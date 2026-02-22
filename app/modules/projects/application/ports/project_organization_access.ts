import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

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
    trx?: TransactionClientContract
  ): Promise<ProjectOrganizationAccessSnapshot | null>

  ensureApprovedMember(
    organizationId: string,
    actorUserId: string,
    trx?: TransactionClientContract
  ): Promise<void>
}
