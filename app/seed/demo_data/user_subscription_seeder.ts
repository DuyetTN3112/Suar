import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import type { SeedRuntime } from './seed_runtime.js'
import { applyWhere, findRow } from './seed_utils.js'
import type { SeededUser, UserKey } from './types.js'
import { SEED_USER_SUBSCRIPTIONS_SPECS } from './user_subscriptions_specs.js'

export async function seedUserSubscriptions(
  runtime: SeedRuntime,
  trx: TransactionClientContract,
  users: Record<UserKey, SeededUser>
): Promise<void> {
  const rows = SEED_USER_SUBSCRIPTIONS_SPECS

  for (const row of rows) {
    const where = { user_id: users[row.user].id }
    const existing = await findRow(trx, 'user_subscriptions', where)
    const payload = {
      plan: row.plan,
      status: row.status,
      started_at: runtime.isoDaysAgo(row.startedDaysAgo),
      expires_at: runtime.isoDaysAhead(row.expiresInDays),
      auto_renew: row.autoRenew,
      created_at: runtime.isoDaysAgo(20),
      updated_at: runtime.isoDaysAgo(1),
    }

    if (existing) {
      await applyWhere(trx.from('user_subscriptions'), where).update(payload)
    } else {
      await trx
        .insertQuery()
        .table('user_subscriptions')
        .insert({ id: runtime.uuid(), ...where, ...payload })
    }
  }
}
