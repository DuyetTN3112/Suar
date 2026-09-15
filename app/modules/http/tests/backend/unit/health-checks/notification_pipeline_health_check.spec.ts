import { test } from '@japa/runner'

import { NotificationPipelineHealthCheck } from '#modules/http/health_checks/notification_pipeline_health_check'

const now = new Date('2026-07-23T12:00:00.000Z')

function status(overrides: Record<string, number | null> = {}) {
  return {
    pending: 0,
    leased: 0,
    retryPending: 0,
    processed: 0,
    deadLetter: 0,
    oldestPendingAgeMs: null,
    ...overrides,
  }
}

function retention(overrides: Record<string, number> = {}) {
  return {
    dueNotifications: 0,
    eligibleProcessedOutbox: 0,
    eligibleCompletedFanoutJobs: 0,
    outboxDeadLetters: 0,
    fanoutDeadLetters: 0,
    tombstonesAwaitingProjectionProof: 0,
    expiredRollbackTargets: 0,
    retiredIndicesAwaitingDeletion: 0,
    ...overrides,
  }
}

function reader(input: {
  outbox?: ReturnType<typeof status>
  fanout?: ReturnType<typeof status> & {
    activeJobs: number
    completedJobs: number
    completedWithErrorsJobs: number
  }
  retention?: ReturnType<typeof retention>
  error?: Error
} = {}) {
  return {
    snapshot() {
      if (input.error) {
        return Promise.reject(input.error)
      }
      return Promise.resolve({
        outbox: input.outbox ?? status(),
        fanout:
          input.fanout ??
          ({
            ...status(),
            activeJobs: 0,
            completedJobs: 0,
            completedWithErrorsJobs: 0,
          } as const),
        retention: input.retention ?? retention(),
      })
    },
  }
}

const thresholds = {
  warningAgeMs: 30_000,
  failureAgeMs: 300_000,
  warningPending: 10_000,
  failurePending: 100_000,
}

test.group('NotificationPipelineHealthCheck', () => {
  test('is healthy when outbox and fanout queues are current', async ({ assert }) => {
    const result = await new NotificationPipelineHealthCheck(
      reader(),
      thresholds,
      () => now
    ).run()

    assert.equal(result.status, 'ok')
    assert.equal(result.meta?.['outbox_pending'], 0)
    assert.equal(result.meta?.['fanout_pending'], 0)
  })

  test('warns without failing readiness when a dead letter requires operator review', async ({
    assert,
  }) => {
    const result = await new NotificationPipelineHealthCheck(
      reader({
        outbox: status({ deadLetter: 1 }),
      }),
      thresholds,
      () => now
    ).run()

    assert.equal(result.status, 'warning')
    assert.equal(result.meta?.['outbox_dead_letter'], 1)
    assert.equal(result.meta?.['operator_action_required'], true)
  })

  test('surfaces overdue retention evidence and retired index cleanup', async ({
    assert,
  }) => {
    const result = await new NotificationPipelineHealthCheck(
      reader({
        retention: retention({
          tombstonesAwaitingProjectionProof: 2,
          retiredIndicesAwaitingDeletion: 1,
        }),
      }),
      thresholds,
      () => now
    ).run()

    assert.equal(result.status, 'warning')
    assert.equal(result.meta?.['retention_tombstones_awaiting_projection_proof'], 2)
    assert.equal(result.meta?.['retention_retired_indices_awaiting_deletion'], 1)
    assert.equal(result.meta?.['operator_action_required'], true)
  })

  test('fails when durable work exceeds the failure lag objective', async ({ assert }) => {
    const result = await new NotificationPipelineHealthCheck(
      reader({
        fanout: {
          ...status({ pending: 1, oldestPendingAgeMs: 301_000 }),
          activeJobs: 1,
          completedJobs: 0,
          completedWithErrorsJobs: 0,
        },
      }),
      thresholds,
      () => now
    ).run()

    assert.equal(result.status, 'error')
    assert.equal(result.meta?.['fanout_oldest_pending_age_seconds'], 301)
  })

  test('fails closed when pipeline state cannot be inspected', async ({ assert }) => {
    const result = await new NotificationPipelineHealthCheck(
      reader({ error: new Error('database unavailable') }),
      thresholds,
      () => now
    ).run()

    assert.equal(result.status, 'error')
    assert.equal(result.meta?.['error_class'], 'Error')
    assert.notProperty(result.meta, 'error_message')
  })
})
