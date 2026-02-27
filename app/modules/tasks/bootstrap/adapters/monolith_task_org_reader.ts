import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { organizationPublicApi } from '#modules/organizations/public_contracts/organization_public_api'
import type { TaskOrgReader } from '#modules/tasks/actions/ports/task_external_dependencies'

export class MonolithTaskOrgReader implements TaskOrgReader {
  async ensureActiveOrganization(
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<void> {
    await organizationPublicApi.ensureActiveOrganization(organizationId, trx)
  }

  async isApprovedMember(
    userId: string,
    organizationId: string,
    trx?: TransactionClientContract
  ): Promise<boolean> {
    return organizationPublicApi.isApprovedMember(userId, organizationId, trx)
  }
}
