import type { FilterTransaction } from './filter_transaction_runner.js'

import type { FilterAlert } from '#modules/filtering/domain/filter-alert/filter_alert'

export interface FilterAlertRecord {
  readonly alert: FilterAlert
  readonly lockVersion: number
}

export interface FilterAlertRepository {
  create(alert: FilterAlert): Promise<FilterAlertRecord>
  findById(alertId: string): Promise<FilterAlertRecord | null>
  findBySavedViewId(savedViewId: string, transaction?: FilterTransaction): Promise<FilterAlertRecord | null>
  claimDue(input: {
    readonly now: string
    readonly workerId: string
    readonly leaseExpiresAt: string
    readonly fenceToken: string
  }): Promise<FilterAlertRecord | null>
  complete(input: {
    readonly alertId: string
    readonly expectedLockVersion: number
    readonly workerId: string
    readonly fenceToken: string
    readonly lastSuccessfulWatermark: string
    readonly completedAt: string
    readonly nextRunAt: string
  }): Promise<FilterAlertRecord | null>
  fail(input: {
    readonly alertId: string
    readonly expectedLockVersion: number
    readonly workerId: string
    readonly fenceToken: string
    readonly reason: string
    readonly retryAt: string
  }): Promise<FilterAlertRecord | null>
  updateSchedule(input: {
    readonly alertId: string
    readonly expectedLockVersion: number
    readonly intervalMinutes: number
    readonly timezone: string
    readonly updatedAt: string
  }): Promise<FilterAlertRecord | null>
  setStatus(input: {
    readonly alertId: string
    readonly expectedLockVersion: number
    readonly status: FilterAlert['status']
    readonly pauseReason: string | null
    readonly updatedAt: string
    readonly transaction?: FilterTransaction
  }): Promise<FilterAlertRecord | null>
  softDelete(input: { readonly alertId: string; readonly expectedLockVersion: number; readonly deletedAt: string }): Promise<boolean>
}
