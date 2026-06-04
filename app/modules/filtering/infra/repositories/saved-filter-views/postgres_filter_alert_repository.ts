import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'

import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import type {
  FilterAlertRecord,
  FilterAlertRepository,
} from '#modules/filtering/actions/ports/outbound/filter_alert_repository'
import type { FilterTransaction } from '#modules/filtering/actions/ports/outbound/filter_transaction_runner'
import type { FilterAlert } from '#modules/filtering/domain/filter-alert/filter_alert'

interface AlertRow {
  id: string
  saved_view_id: string
  owner_user_id: string
  saved_view_lock_version: number | string
  status: FilterAlert['status']
  pause_reason: string | null
  interval_minutes: number | string
  timezone: string
  last_successful_watermark: string | null
  last_successful_at: Date | string | null
  next_run_at: Date | string
  retry_count: number | string
  lease_owner_id: string | null
  lease_expires_at: Date | string | null
  fence_token: string | null
  lock_version: number | string
  deleted_at: Date | string | null
}

function iso(value: Date | string | null): string | null {
  if (value === null) return null
  const parsed = new Date(value)
  if (!Number.isFinite(parsed.getTime())) throw new PersistedDataIntegrityException('corrupted_filter_alert_timestamp')
  return parsed.toISOString()
}

function integer(value: number | string): number {
  const parsed = Number(value)
  if (!Number.isSafeInteger(parsed)) throw new PersistedDataIntegrityException('corrupted_filter_alert_integer')
  return parsed
}

function mapRow(row: AlertRow): FilterAlertRecord {
  return {
    lockVersion: integer(row.lock_version),
    alert: {
      id: row.id,
      savedViewId: row.saved_view_id,
      ownerId: row.owner_user_id,
      savedViewLockVersion: integer(row.saved_view_lock_version),
      status: row.status,
      pauseReason: row.pause_reason,
      intervalMinutes: integer(row.interval_minutes),
      timezone: row.timezone,
      lastSuccessfulWatermark: row.last_successful_watermark,
      lastSuccessfulAt: iso(row.last_successful_at),
      nextRunAt: iso(row.next_run_at) ?? '',
      retryCount: integer(row.retry_count),
      leaseOwnerId: row.lease_owner_id,
      leaseExpiresAt: iso(row.lease_expires_at),
      fenceToken: row.fence_token,
      deletedAt: iso(row.deleted_at),
    },
  }
}

function returnedRows(result: unknown): AlertRow[] {
  if (result === null || typeof result !== 'object' || !('rows' in result) || !Array.isArray(result.rows)) {
    throw new PersistedDataIntegrityException('filter_alert_query_failed')
  }
  return result.rows as AlertRow[]
}

export class PostgresFilterAlertRepository implements FilterAlertRepository {
  async create(alert: FilterAlert): Promise<FilterAlertRecord> {
    const [row] = (await db.table('filter_alerts').insert({
      id: alert.id,
      saved_view_id: alert.savedViewId,
      owner_user_id: alert.ownerId,
      saved_view_lock_version: alert.savedViewLockVersion,
      status: alert.status,
      pause_reason: alert.pauseReason,
      interval_minutes: alert.intervalMinutes,
      timezone: alert.timezone,
      last_successful_watermark: alert.lastSuccessfulWatermark,
      last_successful_at: alert.lastSuccessfulAt,
      next_run_at: alert.nextRunAt,
      retry_count: alert.retryCount,
      lease_owner_id: alert.leaseOwnerId,
      lease_expires_at: alert.leaseExpiresAt,
      fence_token: alert.fenceToken,
      lock_version: 1,
      deleted_at: null,
    }).returning('*')) as AlertRow[]
    if (!row) throw new PersistedDataIntegrityException('filter_alert_create_failed')
    return mapRow(row)
  }

  async findById(alertId: string): Promise<FilterAlertRecord | null> {
    const row = (await db.from('filter_alerts').where('id', alertId).whereNull('deleted_at').first()) as AlertRow | undefined
    return row ? mapRow(row) : null
  }

  async findBySavedViewId(savedViewId: string, transaction?: FilterTransaction): Promise<FilterAlertRecord | null> {
    const client = transaction === undefined ? db : (transaction as TransactionClientContract)
    const row = (await client.from('filter_alerts').where('saved_view_id', savedViewId).whereNull('deleted_at').first()) as AlertRow | undefined
    return row ? mapRow(row) : null
  }

  async claimDue(input: { now: string; workerId: string; leaseExpiresAt: string; fenceToken: string }): Promise<FilterAlertRecord | null> {
    const result: unknown = await db.rawQuery(
      `UPDATE filter_alerts
       SET lease_owner_id = ?, lease_expires_at = ?, fence_token = ?,
           lock_version = lock_version + 1, updated_at = ?
       WHERE id = (
         SELECT id FROM filter_alerts
         WHERE status = 'active' AND next_run_at <= ? AND deleted_at IS NULL
           AND (lease_expires_at IS NULL OR lease_expires_at <= ?)
         ORDER BY next_run_at ASC, id ASC LIMIT 1
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`,
      [input.workerId, input.leaseExpiresAt, input.fenceToken, input.now, input.now, input.now]
    )
    const row = returnedRows(result)[0]
    return row ? mapRow(row) : null
  }

  async complete(input: { alertId: string; expectedLockVersion: number; workerId: string; fenceToken: string; lastSuccessfulWatermark: string; completedAt: string; nextRunAt: string }): Promise<FilterAlertRecord | null> {
    const [row] = (await db.from('filter_alerts').where('id', input.alertId).where('lock_version', input.expectedLockVersion).where('lease_owner_id', input.workerId).where('fence_token', input.fenceToken).whereNull('deleted_at').update({ status: 'active', pause_reason: null, last_successful_watermark: input.lastSuccessfulWatermark, last_successful_at: input.completedAt, next_run_at: input.nextRunAt, retry_count: 0, lease_owner_id: null, lease_expires_at: null, fence_token: null, lock_version: input.expectedLockVersion + 1, updated_at: input.completedAt }, ['*'])) as AlertRow[]
    return row ? mapRow(row) : null
  }

  async fail(input: { alertId: string; expectedLockVersion: number; workerId: string; fenceToken: string; reason: string; retryAt: string }): Promise<FilterAlertRecord | null> {
    const result: unknown = await db.rawQuery(
      `UPDATE filter_alerts
       SET status = 'paused', pause_reason = ?, next_run_at = ?, retry_count = retry_count + 1,
           lease_owner_id = NULL, lease_expires_at = NULL, fence_token = NULL,
           lock_version = lock_version + 1, updated_at = ?
       WHERE id = ? AND lock_version = ? AND lease_owner_id = ? AND fence_token = ? AND deleted_at IS NULL
       RETURNING *`,
      [input.reason, input.retryAt, input.retryAt, input.alertId, input.expectedLockVersion, input.workerId, input.fenceToken]
    )
    const row = returnedRows(result)[0]
    return row ? mapRow(row) : null
  }

  async updateSchedule(input: { alertId: string; expectedLockVersion: number; intervalMinutes: number; timezone: string; updatedAt: string }): Promise<FilterAlertRecord | null> {
    const [row] = (await db.from('filter_alerts').where('id', input.alertId).where('lock_version', input.expectedLockVersion).whereNull('deleted_at').update({ interval_minutes: input.intervalMinutes, timezone: input.timezone, lock_version: input.expectedLockVersion + 1, updated_at: input.updatedAt }, ['*'])) as AlertRow[]
    return row ? mapRow(row) : null
  }

  async setStatus(input: { alertId: string; expectedLockVersion: number; status: FilterAlert['status']; pauseReason: string | null; updatedAt: string; transaction?: FilterTransaction }): Promise<FilterAlertRecord | null> {
    const client = input.transaction === undefined ? db : input.transaction as TransactionClientContract
    const [row] = (await client.from('filter_alerts').where('id', input.alertId).where('lock_version', input.expectedLockVersion).whereNull('deleted_at').update({ status: input.status, pause_reason: input.pauseReason, lock_version: input.expectedLockVersion + 1, updated_at: input.updatedAt }, ['*'])) as AlertRow[]
    return row ? mapRow(row) : null
  }

  async softDelete(input: { alertId: string; expectedLockVersion: number; deletedAt: string }): Promise<boolean> {
    const affected = await db.from('filter_alerts').where('id', input.alertId).where('lock_version', input.expectedLockVersion).whereNull('deleted_at').update({ deleted_at: input.deletedAt, updated_at: input.deletedAt, lock_version: input.expectedLockVersion + 1 })
    return Number(affected) === 1
  }
}
