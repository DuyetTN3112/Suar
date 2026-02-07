import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { seedDefaultTaskStatuses } from '../commands/seed_default_task_statuses.js'

import type { DatabaseId } from '#types/database'

export interface OrgTaskBootstrap {
  seedDefaultStatusesForOrganization(
    organizationId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void>
}

export const orgTaskBootstrap: OrgTaskBootstrap = {
  seedDefaultStatusesForOrganization: seedDefaultTaskStatuses,
}
