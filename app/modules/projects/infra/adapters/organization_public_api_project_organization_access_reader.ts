import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import type {
  ProjectOrganizationAccessReader,
  ProjectOrganizationAccessSnapshot,
} from '#modules/projects/application/ports/project_organization_access'

export class OrganizationPublicApiProjectOrganizationAccessReader
  implements ProjectOrganizationAccessReader
{
  async findOrganizationAccess(
    params: {
      organizationId: string
      actorUserId: string
    },
    trx?: TransactionClientContract
  ): Promise<ProjectOrganizationAccessSnapshot | null> {
    const membership = await organizationPublicApi.getMembershipContext(
      params.organizationId,
      params.actorUserId,
      trx,
      true
    )

    return {
      organizationId: params.organizationId,
      actorUserId: params.actorUserId,
      actorOrganizationRole: membership?.role ?? null,
      actorMembershipStatus: null,
    }
  }

  async ensureApprovedMember(
    organizationId: string,
    actorUserId: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    await organizationPublicApi.ensureApprovedMember(organizationId, actorUserId, trx)
  }
}
