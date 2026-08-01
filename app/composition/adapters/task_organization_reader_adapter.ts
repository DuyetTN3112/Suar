import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  organizationMembershipRepository,
  organizationReader,
} from '#composition/organization_persistence_composition'
import type {
  TaskOrganizationSummary,
  TaskOrgReader,
} from '#modules/tasks/actions/ports/outbound/task_external_dependencies'

export class TaskOrganizationReaderAdapter implements TaskOrgReader {
  async ensureActiveOrganization(
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    await organizationReader.findActiveOrFail(organizationId, trx)
  }

  findOrganizationSummaries(
    organizationIds: string[],
    trx?: TransactionClientContract
  ): Promise<TaskOrganizationSummary[]> {
    const uniqueIds = [...new Set(organizationIds)]
    return organizationReader.findActiveBasicListByIds(uniqueIds, trx).then((organizations) =>
      organizations.map((organization) => ({
        id: organization.id,
        name: organization.name,
        logo: organization.logo,
      }))
    )
  }

  isApprovedMember(
    userId: string,
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return organizationMembershipRepository.isApprovedMember(userId, organizationId, trx)
  }
}
