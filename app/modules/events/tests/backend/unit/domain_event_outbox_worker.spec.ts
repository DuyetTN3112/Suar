import { randomUUID } from 'node:crypto'

import { test } from '@japa/runner'

import type {
  DomainEventDeadLetterInput,
  DomainEventLeaseMutationInput,
  DomainEventOutboxRepository,
  DomainEventRetryInput,
  DurableDomainEventDispatcher,
  DurableDomainEventJob,
} from '#modules/events/domain/domain-event-outbox-administration/domain_event_outbox'
import { buildDurableDomainEventFingerprint } from '#modules/events/domain/domain-event-outbox-administration/domain_event_outbox'
import { DomainEventOutboxWorker } from '#modules/events/infra/adapters/domain-event-outbox-administration/domain_event_outbox_worker'
import { DomainEventDeliveryError } from '#modules/events/public_contracts/domain_event_delivery_error'

const now = new Date('2026-07-26T00:00:00.000Z')

function makeJob(overrides: Partial<DurableDomainEventJob> = {}): DurableDomainEventJob {
  const assignmentId = randomUUID()
  const job = {
    id: randomUUID(),
    sequence: 1,
    eventName: 'task:assignment:completed',
    eventVersion: 1,
    aggregateType: 'task_assignment',
    aggregateId: assignmentId,
    payload: {
      taskId: randomUUID(),
      assignmentId,
      assigneeId: randomUUID(),
    },
    dedupeFingerprint: '',
    attemptCount: 1,
    leaseToken: randomUUID(),
    lockedUntil: new Date(now.getTime() + 30_000),
    ...overrides,
  } satisfies DurableDomainEventJob
  job.dedupeFingerprint =
    overrides.dedupeFingerprint ?? buildDurableDomainEventFingerprint(job)
  return job
}

function makeRepository(
  jobs: DurableDomainEventJob[],
  overrides: {
    acknowledge?: (input: DomainEventLeaseMutationInput) => Promise<boolean>
    retry?: (input: DomainEventRetryInput) => Promise<boolean>
    deadLetter?: (input: DomainEventDeadLetterInput) => Promise<boolean>
  } = {}
): DomainEventOutboxRepository {
  let claimed = false
  return {
    stage: () => Promise.reject(new Error('stage is not used by the worker')),
    claimBatch: () => {
      if (claimed) return Promise.resolve([])
      claimed = true
      return Promise.resolve(jobs)
    },
    heartbeat: () => Promise.resolve(true),
    acknowledge: overrides.acknowledge ?? (() => Promise.resolve(true)),
    retry: overrides.retry ?? (() => Promise.resolve(true)),
    deadLetter: overrides.deadLetter ?? (() => Promise.resolve(true)),
  }
}

test.group('Domain event outbox worker', () => {
  test('dispatches a validated payload and acknowledges with its lease token', async ({
    assert,
  }) => {
    const job = makeJob()
    const dispatched: unknown[] = []
    const deliveryContexts: Array<{ signal: AbortSignal; sequence: number }> = []
    const acknowledgements: DomainEventLeaseMutationInput[] = []
    const dispatcher: DurableDomainEventDispatcher = {
      dispatch: (_eventName, payload, context) => {
        dispatched.push(payload)
        deliveryContexts.push(context)
        return Promise.resolve()
      },
    }
    const repository = makeRepository([job], {
      acknowledge: (input) => {
        acknowledgements.push(input)
        return Promise.resolve(true)
      },
    })

    const result = await new DomainEventOutboxWorker({
      workerId: 'worker-success',
      dispatcher,
      repository,
      now: () => now,
    }).runOnce()

    assert.deepEqual(result, {
      claimed: 1,
      processed: 1,
      retried: 0,
      deadLettered: 0,
      leaseLost: 0,
    })
    assert.deepEqual(dispatched, [job.payload])
    assert.equal(deliveryContexts[0]?.sequence, job.sequence)
    assert.isFalse(deliveryContexts[0]?.signal.aborted)
    assert.equal(acknowledgements[0]?.leaseToken, job.leaseToken)
    assert.isUndefined(acknowledgements[0]?.redactPayload)
  })

  test('requests payload redaction after durable auth evidence is delivered', async ({
    assert,
  }) => {
    const userId = randomUUID()
    const job = makeJob({
      eventName: 'auth:session:observed:v1',
      aggregateType: 'auth_session',
      aggregateId: userId,
      payload: {
        eventId: randomUUID(),
        userId,
        action: 'login',
        occurredAt: '2026-07-26T10:00:00.000Z',
        ipAddress: '203.0.113.7',
        userAgent: 'privacy-test',
        method: 'oauth',
        requestId: 'request-1',
        traceId: 'trace-1',
      },
    })
    job.dedupeFingerprint = buildDurableDomainEventFingerprint(job)
    const acknowledgements: DomainEventLeaseMutationInput[] = []
    const result = await new DomainEventOutboxWorker({
      workerId: 'worker-auth-privacy',
      dispatcher: {
        dispatch: () => Promise.resolve(),
      },
      repository: makeRepository([job], {
        acknowledge: (input) => {
          acknowledgements.push(input)
          return Promise.resolve(true)
        },
      }),
      now: () => now,
    }).runOnce()

    assert.equal(result.processed, 1)
    assert.isTrue(acknowledgements[0]?.redactPayload)
  })

  test('dead-letters a malformed stored payload without dispatching it', async ({ assert }) => {
    const job = makeJob({
      payload: { taskId: 'task-with-missing-required-fields' },
    })
    const deadLetters: DomainEventDeadLetterInput[] = []
    let dispatchCount = 0
    const repository = makeRepository([job], {
      deadLetter: (input) => {
        deadLetters.push(input)
        return Promise.resolve(true)
      },
    })

    const result = await new DomainEventOutboxWorker({
      workerId: 'worker-poison-payload',
      dispatcher: {
        dispatch: () => {
          dispatchCount += 1
          return Promise.resolve()
        },
      },
      repository,
      now: () => now,
    }).runOnce()

    assert.equal(dispatchCount, 0)
    assert.equal(result.deadLettered, 1)
    assert.equal(deadLetters[0]?.errorCode, 'INVALID_DOMAIN_EVENT_PAYLOAD')
    assert.notProperty(deadLetters[0] ?? {}, 'errorMessage')
  })

  test('permanently dead-letters a corrupt persisted envelope without dispatching it', async ({
    assert,
  }) => {
    const secret = 'must-not-leak-from-corrupt-envelope'
    const payloadTamperedAfterStaging = makeJob()
    payloadTamperedAfterStaging.payload = {
      ...(payloadTamperedAfterStaging.payload as Record<string, unknown>),
      assigneeId: randomUUID(),
    }
    const cases = [
      makeJob({ eventVersion: 2 }),
      makeJob({ aggregateId: randomUUID() }),
      makeJob({ aggregateType: 'user_talent' }),
      payloadTamperedAfterStaging,
      makeJob({ dedupeFingerprint: secret }),
    ]
    const deadLetters: DomainEventDeadLetterInput[] = []
    let dispatchCount = 0
    const repository = makeRepository(cases, {
      deadLetter: (input) => {
        deadLetters.push(input)
        return Promise.resolve(true)
      },
    })

    const result = await new DomainEventOutboxWorker({
      workerId: 'worker-corrupt-envelope',
      dispatcher: {
        dispatch: () => {
          dispatchCount += 1
          return Promise.resolve()
        },
      },
      repository,
      now: () => now,
      concurrency: 1,
    }).runOnce()

    assert.equal(dispatchCount, 0)
    assert.equal(result.deadLettered, cases.length)
    assert.deepEqual(
      deadLetters.map((input) => input.errorCode),
      cases.map(() => 'INVALID_DOMAIN_EVENT_ENVELOPE')
    )
    assert.notInclude(JSON.stringify(deadLetters), secret)
    assert.isTrue(deadLetters.every((input) => !('errorMessage' in input)))
  })

  test('retries transient delivery with bounded exponential backoff and an error code only', async ({
    assert,
  }) => {
    const job = makeJob({ attemptCount: 3 })
    const retries: DomainEventRetryInput[] = []
    const secret = 'must-not-be-persisted'
    const repository = makeRepository([job], {
      retry: (input) => {
        retries.push(input)
        return Promise.resolve(true)
      },
    })

    const result = await new DomainEventOutboxWorker({
      workerId: 'worker-retry',
      dispatcher: {
        dispatch: () =>
          Promise.reject(Object.assign(new Error(secret), { code: 'DEPENDENCY_TIMEOUT' })),
      },
      repository,
      now: () => now,
      random: () => 0.5,
      retryBaseMs: 1_000,
      retryCapMs: 10_000,
    }).runOnce()

    assert.equal(result.retried, 1)
    assert.equal(retries[0]?.errorCode, 'DEPENDENCY_TIMEOUT')
    assert.equal(retries[0]?.availableAt.getTime(), now.getTime() + 4_000)
    assert.notInclude(JSON.stringify(retries), secret)
  })

  test('dead-letters permanent failures and reports a fenced lease loss', async ({ assert }) => {
    const permanent = makeJob({ sequence: 1 })
    const stale = makeJob({ sequence: 2 })
    let calls = 0
    const repository = makeRepository([permanent, stale], {
      deadLetter: () => {
        calls += 1
        return Promise.resolve(calls === 1)
      },
    })

    const result = await new DomainEventOutboxWorker({
      workerId: 'worker-fencing',
      dispatcher: {
        dispatch: () => Promise.reject(new DomainEventDeliveryError('SUBSCRIBER_REJECTED', false)),
      },
      repository,
      now: () => now,
      concurrency: 1,
    }).runOnce()

    assert.deepEqual(result, {
      claimed: 2,
      processed: 0,
      retried: 0,
      deadLettered: 1,
      leaseLost: 1,
    })
  })

  test('isolates retry persistence failure and waits for sibling delivery', async ({ assert }) => {
    const retryFailure = makeJob({ sequence: 1 })
    const slowSuccess = makeJob({ sequence: 2 })
    let slowDeliveryCompleted = false
    const repository = makeRepository([retryFailure, slowSuccess], {
      retry: () => Promise.reject(new Error('retry persistence unavailable')),
    })

    const result = await new DomainEventOutboxWorker({
      workerId: 'worker-retry-persistence-isolation',
      dispatcher: {
        dispatch: async (_eventName, payload) => {
          if (
            (payload as { assignmentId: string }).assignmentId ===
            (retryFailure.payload as { assignmentId: string }).assignmentId
          ) {
            throw new Error('transient listener failure')
          }
          await new Promise<void>((resolve) => {
            setTimeout(resolve, 20)
          })
          slowDeliveryCompleted = true
        },
      },
      repository,
      now: () => now,
      concurrency: 2,
    }).runOnce()

    assert.isTrue(slowDeliveryCompleted)
    assert.deepEqual(result, {
      claimed: 2,
      processed: 1,
      retried: 0,
      deadLettered: 0,
      leaseLost: 1,
    })
  })

  test('isolates dead-letter persistence failure and waits for sibling delivery', async ({
    assert,
  }) => {
    const deadLetterFailure = makeJob({ sequence: 1 })
    const slowSuccess = makeJob({ sequence: 2 })
    let slowDeliveryCompleted = false
    const repository = makeRepository([deadLetterFailure, slowSuccess], {
      deadLetter: () => Promise.reject(new Error('dead-letter persistence unavailable')),
    })

    const result = await new DomainEventOutboxWorker({
      workerId: 'worker-dead-letter-persistence-isolation',
      dispatcher: {
        dispatch: async (_eventName, payload) => {
          if (
            (payload as { assignmentId: string }).assignmentId ===
            (deadLetterFailure.payload as { assignmentId: string }).assignmentId
          ) {
            throw new DomainEventDeliveryError('PERMANENT_LISTENER_FAILURE', false)
          }
          await new Promise<void>((resolve) => {
            setTimeout(resolve, 20)
          })
          slowDeliveryCompleted = true
        },
      },
      repository,
      now: () => now,
      concurrency: 2,
    }).runOnce()

    assert.isTrue(slowDeliveryCompleted)
    assert.deepEqual(result, {
      claimed: 2,
      processed: 1,
      retried: 0,
      deadLettered: 0,
      leaseLost: 1,
    })
  })
})
