import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { OrganizationRole, OrganizationUserStatus } from '#modules/organizations/access/public_contracts/organization_constants'
import OrganizationUser from '#modules/organizations/members/infra/models/organization_user'

/**
 * OrgAccessRepository
 *
 * Data access for organization invitations and join requests.
 * Invitation source-of-truth now lives on organization_users with invited_by + pending status.
 */
export default class OrgAccessRepository {
  private readonly _instanceMarker = true

  static {
    void new OrgAccessRepository()._instanceMarker
  }

  // ── Invitation queries ──

  static async createInvitation(
    data: {
      organization_id: string
      user_id: string
      org_role?: string
      invited_by: string
    },
    trx?: TransactionClientContract
  ): Promise<OrganizationUser> {
    const createData = {
      organization_id: data.organization_id,
      user_id: data.user_id,
      org_role: data.org_role ?? OrganizationRole.MEMBER,
      invited_by: data.invited_by,
      status: OrganizationUserStatus.PENDING,
    }
    if (trx) {
      return OrganizationUser.create(createData, { client: trx })
    }
    return OrganizationUser.create(createData)
  }
}
