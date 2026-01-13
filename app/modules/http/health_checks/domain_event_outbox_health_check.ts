import { BaseCheck, Result } from '@adonisjs/core/health'
import type { HealthCheckResult } from '@adonisjs/core/types/health'

import {
  readDomainEventOutboxStatus,
  type DomainEventOutboxStatusReader,
} from '#modules/events/public_contracts/domain_event_outbox_status'
import env from '#start/env'

export interface DomainEventOutboxHealthThresholds {
  warningDuePending: number
  failureDuePending: number
  warningDueAgeMs: number
  failureDueAgeMs: number
  failureExpiredLeaseAgeMs: number
}

const DEFAULT_THRESHOLDS: DomainEventOutboxHealthThresholds = {
  warningDuePending: env.get('DOMAIN_EVENT_OUTBOX_WARN_DUE_PENDING', 1_000),
  failureDuePending: env.get('DOMAIN_EVENT_OUTBOX_FAIL_DUE_PENDING', 10_000),
  warningDueAgeMs: env.get('DOMAIN_EVENT_OUTBOX_WARN_DUE_AGE_SECONDS', 30) * 1_000,
  failureDueAgeMs: env.get('DOMAIN_EVENT_OUTBOX_FAIL_DUE_AGE_SECONDS', 300) * 1_000,
  failureExpiredLeaseAgeMs:
    env.get('DOMAIN_EVENT_OUTBOX_FAIL_EXPIRED_LEASE_AGE_SECONDS', 60) * 1_000,
}

function seconds(value: number | null): number | null {
  return value === null ? null : Math.floor(value / 1_000)
}

function validateThresholds(thresholds: DomainEventOutboxHealthThresholds): void {
  if (
    !Number.isSafeInteger(thresholds.warningDuePending) ||
    thresholds.warningDuePending < 1 ||
    !Number.isSafeInteger(thresholds.failureDuePending) ||
    thresholds.failureDuePending <= thresholds.warningDuePending ||
    !Number.isSafeInteger(thresholds.warningDueAgeMs) ||
    thresholds.warningDueAgeMs < 1 ||
    !Number.isSafeInteger(thresholds.failureDueAgeMs) ||
    thresholds.failureDueAgeMs <= thresholds.warningDueAgeMs ||
    !Number.isSafeInteger(thresholds.failureExpiredLeaseAgeMs) ||
    thresholds.failureExpiredLeaseAgeMs < 1
  ) {
    throw new RangeError(
      'Domain event outbox health thresholds require positive warning values below failure values'
    )
  }
}

export class DomainEventOutboxHealthCheck extends BaseCheck {
  public readonly name = 'domain_event_outbox'

  constructor(
    private readonly reader: DomainEventOutboxStatusReader = {
      status: readDomainEventOutboxStatus,
    },
    private readonly now: () => Date = () => new Date(),
    private readonly thresholds: DomainEventOutboxHealthThresholds = DEFAULT_THRESHOLDS
  ) {
    super()
    validateThresholds(thresholds)
  }

  async run(): Promise<HealthCheckResult> {
    try {
      const observedAt = this.now()
      const status = await this.reader.status(observedAt)
      const metadata = {
        due_pending: status.duePending,
        due_pending_count_capped: status.duePendingCountCapped,
        future_backoff_pending: status.futureBackoffPending,
        future_backoff_pending_count_capped: status.futureBackoffPendingCountCapped,
        active_leases: status.activeLeases,
        active_lease_count_capped: status.activeLeaseCountCapped,
        expired_leases: status.expiredLeases,
        expired_lease_count_capped: status.expiredLeaseCountCapped,
        dead_letter: status.deadLetter,
        dead_letter_count_capped: status.deadLetterCountCapped,
        oldest_due_pending_age_seconds: seconds(status.oldestDuePendingAgeMs),
        next_backoff_due_in_seconds: seconds(status.nextBackoffDueInMs),
        next_active_lease_expiry_in_seconds: seconds(status.nextActiveLeaseExpiryInMs),
        oldest_expired_lease_age_seconds: seconds(status.oldestExpiredLeaseAgeMs),
        oldest_dead_letter_age_seconds: seconds(status.oldestDeadLetterAgeMs),
        count_cap: status.countCap,
      }

      if (
        status.deadLetter > 0 ||
        status.deadLetterCountCapped ||
        status.expiredLeaseCountCapped ||
        (status.oldestExpiredLeaseAgeMs ?? 0) >=
          this.thresholds.failureExpiredLeaseAgeMs ||
        status.duePendingCountCapped ||
        status.duePending >= this.thresholds.failureDuePending ||
        (status.oldestDuePendingAgeMs ?? 0) >= this.thresholds.failureDueAgeMs
      ) {
        return Result.failed('Domain event outbox requires operator action')
          .mergeMetaData(metadata)
          .toJSON()
      }

      if (
        status.expiredLeases > 0 ||
        status.duePending >= this.thresholds.warningDuePending ||
        (status.oldestDuePendingAgeMs ?? 0) >= this.thresholds.warningDueAgeMs
      ) {
        return Result.warning('Domain event outbox is falling behind')
          .mergeMetaData(metadata)
          .toJSON()
      }

      return Result.ok('Domain event outbox is current').mergeMetaData(metadata).toJSON()
    } catch {
      return Result.failed('Unable to inspect domain event outbox').toJSON()
    }
  }
}
