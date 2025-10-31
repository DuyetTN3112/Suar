import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { orgTaskBootstrap } from '#modules/tasks/actions/bootstrap/org_task_bootstrap'

export interface TaskWorkflowInitializer {
  seedDefaultStatusesForOrganization(
    organizationId: string,
    trx: TransactionClientContract
  ): Promise<void>
}

export const taskWorkflowInitializer: TaskWorkflowInitializer = {
  async seedDefaultStatusesForOrganization(
    organizationId: string,
    trx: TransactionClientContract
  ): Promise<void> {
    await orgTaskBootstrap.seedDefaultStatusesForOrganization(organizationId, trx)
  },
}
