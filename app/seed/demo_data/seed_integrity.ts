import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import {
  assertNotificationAndAuditIntegrity,
  assertProfileAndWorkHistoryIntegrity,
  collectPersistedVisibleCopy,
} from './integrity/profile_and_event_integrity.js'
import { assertReviewAndDisputeIntegrity } from './integrity/review_and_dispute_integrity.js'
import {
  assertSprintAndPackageIntegrity,
  assertTaskAndAssignmentIntegrity,
} from './integrity/task_and_sprint_integrity.js'
import { assertUserAndOrgIntegrity } from './integrity/user_and_org_integrity.js'
import { SEED_ORGANIZATIONS_SPECS } from './organization_seeds_specs.js'
import { assertNoBannedSeedCopy, collectVisibleSeedCopy } from './seed_copy_guard.js'
import type { SeedContext, TaskSpec } from './types.js'
import { SEED_USERS_SPECS } from './user_seeds_specs.js'

export async function assertSeedIntegrity(
  trx: TransactionClientContract,
  context: SeedContext,
  taskSpecs: TaskSpec[]
): Promise<void> {
  assertNoBannedSeedCopy(
    collectVisibleSeedCopy({
      organizations: SEED_ORGANIZATIONS_SPECS,
      users: SEED_USERS_SPECS,
      tasks: taskSpecs,
    })
  )

  await assertUserAndOrgIntegrity(trx, context)
  await assertTaskAndAssignmentIntegrity(trx, context, taskSpecs)
  await assertSprintAndPackageIntegrity(trx, context)
  await assertReviewAndDisputeIntegrity(trx, context)
  await assertProfileAndWorkHistoryIntegrity(trx, context)
  await assertNotificationAndAuditIntegrity(trx)

  assertNoBannedSeedCopy(await collectPersistedVisibleCopy(trx))
}
