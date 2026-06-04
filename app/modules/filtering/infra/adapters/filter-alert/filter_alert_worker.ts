import { createHash } from 'node:crypto'

import type { FilterAlertDelivery } from '#modules/filtering/actions/ports/outbound/filter_alert_delivery'
import type { FilterAlertEvaluator } from '#modules/filtering/actions/ports/outbound/filter_alert_evaluator'
import type { FilterAlertRepository } from '#modules/filtering/actions/ports/outbound/filter_alert_repository'

export interface FilterAlertWorkerInput {
  readonly workerId: string
  readonly now: string
  readonly leaseDurationMs: number
  readonly fenceToken: string
}

export interface FilterAlertWorkerResult {
  readonly claimed: boolean
  readonly delivered: boolean
  readonly watermarkAdvanced: boolean
  readonly leaseLost: boolean
  readonly paused: boolean
}

export function alertDeliveryIdempotencyKey(input: {
  readonly alertId: string
  readonly viewRevision: number
  readonly observationWindow: string
  readonly resultIdentityHash: string
}): string {
  const payload = `${input.alertId}\u0000${input.viewRevision}\u0000${input.observationWindow}\u0000${input.resultIdentityHash}`
  return createHash('sha256').update(payload, 'utf8').digest('hex')
}

export class FilterAlertWorker {
  constructor(
    private readonly repository: FilterAlertRepository,
    private readonly evaluator: FilterAlertEvaluator,
    private readonly delivery: FilterAlertDelivery,
    private readonly retryAt: (now: string) => string = (now) => new Date(Date.parse(now) + 5 * 60_000).toISOString()
  ) {}

  async runOnce(input: FilterAlertWorkerInput): Promise<FilterAlertWorkerResult> {
    const claimed = await this.repository.claimDue({
      now: input.now,
      workerId: input.workerId,
      leaseExpiresAt: new Date(Date.parse(input.now) + input.leaseDurationMs).toISOString(),
      fenceToken: input.fenceToken,
    })
    if (!claimed) return { claimed: false, delivered: false, watermarkAdvanced: false, leaseLost: false, paused: false }

    try {
      const evaluation = await this.evaluator.evaluate(claimed.alert, { now: input.now })
      if (evaluation.providerState !== 'healthy' || evaluation.totalRelation !== 'eq') {
        const failed = await this.repository.fail({
          alertId: claimed.alert.id,
          expectedLockVersion: claimed.lockVersion,
          workerId: input.workerId,
          fenceToken: input.fenceToken,
          reason: evaluation.providerState === 'healthy' ? 'total_not_exact' : 'provider_degraded',
          retryAt: this.retryAt(input.now),
        })
        return { claimed: true, delivered: false, watermarkAdvanced: false, leaseLost: failed === null, paused: failed !== null }
      }

      const idempotencyKey = alertDeliveryIdempotencyKey({
        alertId: claimed.alert.id,
        viewRevision: claimed.alert.savedViewLockVersion,
        observationWindow: evaluation.observationWindow,
        resultIdentityHash: evaluation.resultIdentityHash,
      })
      await this.delivery.deliver({ alert: claimed.alert, evaluation, idempotencyKey })
      const completed = await this.repository.complete({
        alertId: claimed.alert.id,
        expectedLockVersion: claimed.lockVersion,
        workerId: input.workerId,
        fenceToken: input.fenceToken,
        lastSuccessfulWatermark: evaluation.watermark,
        completedAt: input.now,
        nextRunAt: new Date(Date.parse(input.now) + claimed.alert.intervalMinutes * 60_000).toISOString(),
      })
      return { claimed: true, delivered: true, watermarkAdvanced: completed !== null, leaseLost: completed === null, paused: false }
    } catch {
      const failed = await this.repository.fail({
        alertId: claimed.alert.id,
        expectedLockVersion: claimed.lockVersion,
        workerId: input.workerId,
        fenceToken: input.fenceToken,
        reason: 'delivery_or_evaluation_failed',
        retryAt: this.retryAt(input.now),
      })
      return { claimed: true, delivered: false, watermarkAdvanced: false, leaseLost: failed === null, paused: failed !== null }
    }
  }
}
