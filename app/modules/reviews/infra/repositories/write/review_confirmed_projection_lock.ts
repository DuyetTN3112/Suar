import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

const LOCK_NAMESPACE = 'review-confirmed-projection'
const LOCK_TIMEOUT = '5000ms'

/**
 * Serializes every review-confirmation projection for one reviewee while the
 * caller-owned transaction is alive. This protects read/merge/write JSONB
 * projections from overlapping deliveries for different review sessions.
 */
export async function lockReviewConfirmedProjection(
  revieweeId: string,
  trx: TransactionClientContract
): Promise<void> {
  await trx.rawQuery("SELECT set_config('lock_timeout', ?, true)", [LOCK_TIMEOUT])
  await trx.rawQuery(
    `
      SELECT pg_advisory_xact_lock(
        hashtext(?)::integer,
        hashtext(?)::integer
      )
    `,
    [LOCK_NAMESPACE, revieweeId]
  )
}
