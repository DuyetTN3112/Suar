import db from '@adonisjs/lucid/services/db'

import { toAggregateCount } from './persistence_helpers.js'

import type { OrganizationAdministrationRepository } from '#modules/organizations/actions/ports/outbound/access/organization_administration_repository'
import OrganizationInvitationRepository from '#modules/organizations/infra/repositories/invitations/organization_invitation_repository'
import OrganizationMemberRepository from '#modules/organizations/infra/repositories/members/organization_member_repository'
import { OrganizationUserStatus } from '#modules/organizations/public_contracts/access/organization_constants'

export class LucidOrganizationAdministrationRepository implements OrganizationAdministrationRepository {
  private readonly members = new OrganizationMemberRepository()
  private readonly invitations = new OrganizationInvitationRepository()

  listMembers(...args: Parameters<OrganizationMemberRepository['listMembers']>) {
    return this.members.listMembers(...args)
  }

  async getMemberStats(organizationId: string) {
    const approvedCount: Promise<unknown> = db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('status', OrganizationUserStatus.APPROVED)
      .count('* as total')
      .first()
    const pendingCount: Promise<unknown> = db
      .from('organization_users')
      .where('organization_id', organizationId)
      .where('status', OrganizationUserStatus.PENDING)
      .whereNotNull('invited_by')
      .count('* as total')
      .first()

    const [approvedRaw, pendingRaw, byRole] = await Promise.all([
      approvedCount,
      pendingCount,
      this.getRoleDistribution(organizationId),
    ])

    return {
      total: toAggregateCount(approvedRaw),
      byRole: {
        org_owner: byRole.get('org_owner') ?? 0,
        org_admin: byRole.get('org_admin') ?? 0,
        org_member: byRole.get('org_member') ?? 0,
      },
      pendingInvitations: toAggregateCount(pendingRaw),
    }
  }

  async getRoleDistribution(organizationId: string): Promise<Map<string, number>> {
    const rows = (await db
      .from('organization_users')
      .select('org_role')
      .count('* as total')
      .where('organization_id', organizationId)
      .where('status', OrganizationUserStatus.APPROVED)
      .groupBy('org_role')) as { org_role: string; total: number | string }[]

    return new Map(rows.map((row) => [row.org_role, Number(row.total)]))
  }

  listInvitations(...args: Parameters<OrganizationInvitationRepository['listInvitations']>) {
    return this.invitations.listInvitations(...args)
  }
}
