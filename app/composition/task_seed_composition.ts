import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import { seedDefaultTaskStatuses as runSeedDefaultTaskStatuses } from '#modules/tasks/actions/commands/seed_default_task_statuses'
import { LucidTaskLifecycleRepository } from '#modules/tasks/infra/adapters/lucid_task_lifecycle_repository'

const taskLifecycle = new LucidTaskLifecycleRepository()

export function seedDefaultTaskStatuses(
  organizationId: string,
  trx: TransactionClientContract
): Promise<void> {
  return runSeedDefaultTaskStatuses(organizationId, trx, taskLifecycle)
}
