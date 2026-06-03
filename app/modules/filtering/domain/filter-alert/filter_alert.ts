import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

export type FilterAlertStatus = 'active' | 'paused'

export interface FilterAlert {
  readonly id: string
  readonly savedViewId: string
  readonly ownerId: string
  readonly savedViewLockVersion: number
  readonly status: FilterAlertStatus
  readonly pauseReason: string | null
  readonly intervalMinutes: number
  readonly timezone: string
  readonly lastSuccessfulWatermark: string | null
  readonly lastSuccessfulAt: string | null
  readonly nextRunAt: string
  readonly retryCount: number
  readonly leaseOwnerId: string | null
  readonly leaseExpiresAt: string | null
  readonly fenceToken: string | null
  readonly deletedAt: string | null
}

export interface CreateFilterAlertInput {
  readonly id: string
  readonly savedViewId: string
  readonly ownerId: string
  readonly savedViewLockVersion: number
  readonly intervalMinutes: number
  readonly timezone: string
  readonly now: string
}

export type FilterAlertRunResult =
  | { readonly ok: true; readonly alert: FilterAlert }
  | { readonly ok: false; readonly reason: 'already_claimed' | 'fence_mismatch' | 'lease_expired' | 'not_active' }

function iso(value: string): number {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) throw new InvariantViolationException('invalid_alert_timestamp')
  return parsed
}

function nextRunAt(now: string, intervalMinutes: number): string {
  return new Date(iso(now) + intervalMinutes * 60_000).toISOString()
}

function validLease(alert: FilterAlert, workerId: string, fenceToken: string, now: string): boolean {
  return (
    alert.leaseOwnerId === workerId &&
    alert.fenceToken === fenceToken &&
    alert.leaseExpiresAt !== null &&
    iso(alert.leaseExpiresAt) > iso(now)
  )
}

export function createFilterAlert(input: CreateFilterAlertInput): FilterAlert {
  if (input.intervalMinutes < 15) throw new InvariantViolationException('interval_too_short')
  iso(input.now)
  return {
    id: input.id,
    savedViewId: input.savedViewId,
    ownerId: input.ownerId,
    savedViewLockVersion: input.savedViewLockVersion,
    status: 'active',
    pauseReason: null,
    intervalMinutes: input.intervalMinutes,
    timezone: input.timezone,
    lastSuccessfulWatermark: null,
    lastSuccessfulAt: null,
    nextRunAt: nextRunAt(input.now, input.intervalMinutes),
    retryCount: 0,
    leaseOwnerId: null,
    leaseExpiresAt: null,
    fenceToken: null,
    deletedAt: null,
  }
}

export function claimFilterAlert(alert: FilterAlert, input: { workerId: string; now: string; leaseDurationMs: number; fenceToken: string }): FilterAlertRunResult {
  if (alert.status !== 'active' || alert.deletedAt !== null) return { ok: false, reason: 'not_active' }
  if (alert.leaseExpiresAt !== null && iso(alert.leaseExpiresAt) > iso(input.now)) return { ok: false, reason: 'already_claimed' }
  return { ok: true, alert: { ...alert, leaseOwnerId: input.workerId, leaseExpiresAt: new Date(iso(input.now) + input.leaseDurationMs).toISOString(), fenceToken: input.fenceToken } }
}

export function completeFilterAlertRun(alert: FilterAlert, input: { workerId: string; fenceToken: string; now: string; watermark: string; nextRunAt: string }): FilterAlertRunResult {
  if (!validLease(alert, input.workerId, input.fenceToken, input.now)) return { ok: false, reason: 'fence_mismatch' }
  return { ok: true, alert: { ...alert, lastSuccessfulWatermark: input.watermark, lastSuccessfulAt: input.now, nextRunAt: input.nextRunAt, retryCount: 0, leaseOwnerId: null, leaseExpiresAt: null, fenceToken: null, pauseReason: null } }
}

export function failFilterAlertRun(alert: FilterAlert, input: { workerId: string; fenceToken: string; now: string; reason: string; retryAt: string }): FilterAlertRunResult {
  if (!validLease(alert, input.workerId, input.fenceToken, input.now)) return { ok: false, reason: 'fence_mismatch' }
  return { ok: true, alert: { ...alert, status: 'paused', pauseReason: input.reason, nextRunAt: input.retryAt, retryCount: alert.retryCount + 1, leaseOwnerId: null, leaseExpiresAt: null, fenceToken: null } }
}
