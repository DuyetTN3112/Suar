import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { organizationMembershipRepository } from '#composition/organizations/persistence/organization_persistence_composition'
import type {
  ProjectOrganizationAccessReader,
  ProjectOrganizationAccessSnapshot,
} from '#modules/projects/actions/ports/outbound/project_organization_access'

export class OrganizationsProjectOrganizationAccessReaderAdapter implements ProjectOrganizationAccessReader {
  async findOrganizationAccess(
    params: {
      organizationId: string
      actorUserId: string
    },
    trx?: TransactionClientContract
  ): Promise<ProjectOrganizationAccessSnapshot | null> {
    const membership = await organizationMembershipRepository.findApprovedContext(
      params.organizationId,
      params.actorUserId,
      trx
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
    await organizationMembershipRepository.ensureApprovedMember(organizationId, actorUserId, trx)
  }
}
