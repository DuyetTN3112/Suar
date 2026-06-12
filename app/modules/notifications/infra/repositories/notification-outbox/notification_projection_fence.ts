import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

const NOTIFICATION_PROJECTION_FENCE_NAMESPACE = 7_314_221
const NOTIFICATION_PROJECTION_FENCE_KEY = 4_912_773

export async function acquireNotificationProjectionWriterFence(
  trx: TransactionClientContract
): Promise<void> {
  await trx.rawQuery('SELECT pg_advisory_xact_lock_shared(?, ?)', [
    NOTIFICATION_PROJECTION_FENCE_NAMESPACE,
    NOTIFICATION_PROJECTION_FENCE_KEY,
  ])
}

export async function acquireNotificationProjectionCutoverFence(
  trx: TransactionClientContract
): Promise<void> {
  await trx.rawQuery('SELECT pg_advisory_xact_lock(?, ?)', [
    NOTIFICATION_PROJECTION_FENCE_NAMESPACE,
    NOTIFICATION_PROJECTION_FENCE_KEY,
  ])
}
