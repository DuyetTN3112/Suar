import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { seedDefaultTaskStatuses } from '../commands/seed_default_task_statuses.js'


export interface OrgTaskBootstrap {
  seedDefaultStatusesForOrganization(
    organizationId: string,
    trx: TransactionClientContract
  ): Promise<void>
}

export const orgTaskBootstrap: OrgTaskBootstrap = {
  seedDefaultStatusesForOrganization: seedDefaultTaskStatuses,
}
