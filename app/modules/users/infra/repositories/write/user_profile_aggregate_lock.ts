import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

const PROFILE_AGGREGATE_REFRESH_LOCK_NAMESPACE =
  'suar.users.profile_aggregate_refresh.v1'
const PROFILE_AGGREGATE_REFRESH_LOCK_TIMEOUT = '5000ms'

/**
 * Serializes refreshes for one user for the lifetime of the caller transaction.
 * Hash collisions only add conservative serialization; they cannot weaken the
 * lock or expose the raw user identifier in PostgreSQL lock metadata.
 */
export async function lockUserProfileAggregateRefresh(
  userId: string,
  trx: TransactionClientContract
): Promise<void> {
  await trx.rawQuery("SELECT set_config('lock_timeout', ?, true)", [
    PROFILE_AGGREGATE_REFRESH_LOCK_TIMEOUT,
  ])
  await trx.rawQuery(
    'SELECT pg_advisory_xact_lock(hashtext(?), hashtext(?))',
    [PROFILE_AGGREGATE_REFRESH_LOCK_NAMESPACE, userId]
  )
}
