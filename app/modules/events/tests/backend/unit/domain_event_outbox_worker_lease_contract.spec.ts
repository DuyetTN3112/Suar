import { randomUUID } from 'node:crypto'
import { setTimeout as delay } from 'node:timers/promises'

import { test } from '@japa/runner'

import type {
  DomainEventDeadLetterInput,
  DomainEventHeartbeatInput,
  DomainEventLeaseMutationInput,
  DomainEventOutboxRepository,
  DomainEventRetryInput,
  DurableDomainEventDispatcher,
  DurableDomainEventJob,
} from '#modules/events/domain/domain-event-outbox-administration/domain_event_outbox'
import { buildDurableDomainEventFingerprint } from '#modules/events/domain/domain-event-outbox-administration/domain_event_outbox'
import {
  DomainEventOutboxWorker,
  type DomainEventOutboxWorkerOptions,
} from '#modules/events/infra/adapters/domain-event-outbox-administration/domain_event_outbox_worker'

const STARTED_AT = new Date('2026-07-26T12:00:00.000Z')

/**
 * Contract verified here:
 *
 * - Repository heartbeat is fenced by job id and lease token and extends the
 *   lease by the requested duration.
 * - Worker heartbeats while the handler is running.
 * - Worker stops owning the outcome when renewal fails.
 * - Worker bounds handler execution and converts deadline expiry to a safe,
 *   transient retry without acknowledging a late completion.
 */
type HeartbeatDomainEventOutboxRepository = DomainEventOutboxRepository

interface RepositoryEvidence {
  heartbeats: DomainEventHeartbeatInput[]
  acknowledgements: DomainEventLeaseMutationInput[]
  retries: DomainEventRetryInput[]
  deadLetters: DomainEventDeadLetterInput[]
}

function makeJob(): DurableDomainEventJob {
  const assignmentId = randomUUID()
  const job: DurableDomainEventJob = {
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
    lockedUntil: new Date(STARTED_AT.getTime() + 1_000),
  }
  job.dedupeFingerprint = buildDurableDomainEventFingerprint(job)
  return job
}

function makeRepository(
  job: DurableDomainEventJob,
  heartbeat: (input: DomainEventHeartbeatInput) => Promise<boolean>
): { repository: HeartbeatDomainEventOutboxRepository; evidence: RepositoryEvidence } {
  let claimed = false
  const evidence: RepositoryEvidence = {
    heartbeats: [],
    acknowledgements: [],
    retries: [],
    deadLetters: [],
  }
  const repository: HeartbeatDomainEventOutboxRepository = {
    stage: () => Promise.reject(new Error('stage is not used by the worker')),
    claimBatch: () => {
      if (claimed) return Promise.resolve([])
      claimed = true
      return Promise.resolve([job])
    },
    heartbeat: (input) => {
      evidence.heartbeats.push(input)
      return heartbeat(input)
    },
    acknowledge: (input) => {
      evidence.acknowledgements.push(input)
      return Promise.resolve(true)
    },
    retry: (input) => {
      evidence.retries.push(input)
      return Promise.resolve(true)
    },
    deadLetter: (input) => {
      evidence.deadLetters.push(input)
      return Promise.resolve(true)
    },
  }
  return { repository, evidence }
}

function slowSuccessfulDispatcher(durationMs: number): DurableDomainEventDispatcher {
  return {
    dispatch: async () => {
      await delay(durationMs)
    },
  }
}

function workerOptions(
  repository: HeartbeatDomainEventOutboxRepository,
  dispatcher: DurableDomainEventDispatcher,
  overrides: Partial<DomainEventOutboxWorkerOptions> = {}
): DomainEventOutboxWorkerOptions {
  return {
    workerId: 'lease-contract-worker',
    repository,
    dispatcher,
    now: () => new Date(),
    random: () => 0.5,
    leaseDurationMs: 1_000,
    heartbeatIntervalMs: 100,
    handlerDeadlineMs: 300,
    retryBaseMs: 100,
    retryCapMs: 100,
    ...overrides,
  }
}

test.group('Domain event outbox heartbeat and deadline contract', () => {
  test('renews the fenced lease while a handler is still running', async ({ assert }) => {
    const job = makeJob()
    const { repository, evidence } = makeRepository(job, () => Promise.resolve(true))
    const worker = new DomainEventOutboxWorker(
      workerOptions(repository, slowSuccessfulDispatcher(130))
    )

    const result = await worker.runOnce()

    assert.equal(result.processed, 1)
    assert.isAtLeast(evidence.heartbeats.length, 1)
    assert.equal(evidence.heartbeats[0]?.jobId, job.id)
    assert.equal(evidence.heartbeats[0]?.leaseToken, job.leaseToken)
    assert.equal(evidence.heartbeats[0]?.leaseDurationMs, 1_000)
    assert.lengthOf(evidence.acknowledgements, 1)
  })

  test('reports leaseLost and never mutates terminal state after renewal is rejected', async ({
    assert,
  }) => {
    const job = makeJob()
    const { repository, evidence } = makeRepository(job, () => Promise.resolve(false))
    const worker = new DomainEventOutboxWorker(
      workerOptions(repository, slowSuccessfulDispatcher(130))
    )

    const result = await worker.runOnce()

    assert.deepEqual(result, {
      claimed: 1,
      processed: 0,
      retried: 0,
      deadLettered: 0,
      leaseLost: 1,
    })
    assert.lengthOf(evidence.heartbeats, 1)
    assert.lengthOf(evidence.acknowledgements, 0)
    assert.lengthOf(evidence.retries, 0)
    assert.lengthOf(evidence.deadLetters, 0)
  })

  test('treats heartbeat failure as leaseLost without retaining its raw secret', async ({
    assert,
  }) => {
    const job = makeJob()
    const secret = 'heartbeat-credential-must-not-escape'
    const { repository, evidence } = makeRepository(job, () =>
      Promise.reject(new Error(`heartbeat transport failed: ${secret}`))
    )
    const worker = new DomainEventOutboxWorker(
      workerOptions(repository, slowSuccessfulDispatcher(130))
    )

    const result = await worker.runOnce()

    assert.equal(result.leaseLost, 1)
    assert.lengthOf(evidence.acknowledgements, 0)
    assert.lengthOf(evidence.retries, 0)
    assert.lengthOf(evidence.deadLetters, 0)
    assert.notInclude(JSON.stringify({ result, evidence }), secret)
  })

  test('converts handler deadline expiry to a safe transient retry', async ({ assert }) => {
    const job = makeJob()
    const { repository, evidence } = makeRepository(job, () => Promise.resolve(true))
    const worker = new DomainEventOutboxWorker(
      workerOptions(repository, slowSuccessfulDispatcher(160), {
        heartbeatIntervalMs: 100,
        handlerDeadlineMs: 100,
      })
    )

    const result = await worker.runOnce()

    assert.equal(result.retried, 1)
    assert.equal(evidence.retries[0]?.errorCode, 'DOMAIN_EVENT_HANDLER_DEADLINE')
    assert.lengthOf(evidence.acknowledgements, 0)
    assert.notProperty(evidence.retries[0] ?? {}, 'errorMessage')
  })

  test('does not acknowledge when a timed-out handler completes late', async ({ assert }) => {
    const job = makeJob()
    const { repository, evidence } = makeRepository(job, () => Promise.resolve(true))
    const worker = new DomainEventOutboxWorker(
      workerOptions(repository, slowSuccessfulDispatcher(160), {
        heartbeatIntervalMs: 100,
        handlerDeadlineMs: 100,
      })
    )

    const result = await worker.runOnce()
    await delay(180)

    assert.equal(result.retried, 1)
    assert.lengthOf(evidence.retries, 1)
    assert.lengthOf(evidence.acknowledgements, 0)
  })

  test('aborts an active delivery on worker shutdown without mutating terminal state', async ({
    assert,
  }) => {
    const job = makeJob()
    const { repository, evidence } = makeRepository(job, () => Promise.resolve(true))
    const shutdownController = new AbortController()
    let notifyHandlerStarted: (() => void) | undefined
    const handlerStarted = new Promise<void>((resolve) => {
      notifyHandlerStarted = resolve
    })
    let deliverySignal: AbortSignal | undefined
    const worker = new DomainEventOutboxWorker(
      workerOptions(repository, {
        dispatch: (_eventName, _payload, context) => {
          deliverySignal = context.signal
          notifyHandlerStarted?.()
          return new Promise<void>((resolve) => {
            context.signal.addEventListener('abort', () => resolve(), { once: true })
          })
        },
      })
    )

    const run = worker.runOnce({ signal: shutdownController.signal })
    await handlerStarted
    shutdownController.abort(new Error('test shutdown'))
    const result = await run

    assert.isTrue(deliverySignal?.aborted)
    assert.equal(result.aborted, 1)
    assert.equal(result.leaseLost, 0)
    assert.lengthOf(evidence.acknowledgements, 0)
    assert.lengthOf(evidence.retries, 0)
    assert.lengthOf(evidence.deadLetters, 0)
  })

  test('does not acknowledge when a shutdown-aborted handler completes late', async ({
    assert,
  }) => {
    const job = makeJob()
    const { repository, evidence } = makeRepository(job, () => Promise.resolve(true))
    const shutdownController = new AbortController()
    let notifyHandlerStarted: (() => void) | undefined
    const handlerStarted = new Promise<void>((resolve) => {
      notifyHandlerStarted = resolve
    })
    let completeHandler: (() => void) | undefined
    const worker = new DomainEventOutboxWorker(
      workerOptions(repository, {
        dispatch: () => {
          notifyHandlerStarted?.()
          return new Promise<void>((resolve) => {
            completeHandler = resolve
          })
        },
      })
    )

    const run = worker.runOnce({ signal: shutdownController.signal })
    await handlerStarted
    shutdownController.abort(new Error('test shutdown'))
    const result = await run
    completeHandler?.()
    await delay(10)

    assert.equal(result.aborted, 1)
    assert.lengthOf(evidence.acknowledgements, 0)
    assert.lengthOf(evidence.retries, 0)
    assert.lengthOf(evidence.deadLetters, 0)
  })

  test('does not claim new work after shutdown has already started', async ({ assert }) => {
    const job = makeJob()
    const { repository, evidence } = makeRepository(job, () => Promise.resolve(true))
    const originalClaimBatch = repository.claimBatch.bind(repository)
    let claimCount = 0
    repository.claimBatch = (input) => {
      claimCount += 1
      return originalClaimBatch(input)
    }
    const shutdownController = new AbortController()
    shutdownController.abort(new Error('test shutdown'))
    const worker = new DomainEventOutboxWorker(
      workerOptions(repository, slowSuccessfulDispatcher(10))
    )

    const result = await worker.runOnce({ signal: shutdownController.signal })

    assert.deepEqual(result, {
      claimed: 0,
      processed: 0,
      retried: 0,
      deadLettered: 0,
      leaseLost: 0,
    })
    assert.equal(claimCount, 0)
    assert.lengthOf(evidence.acknowledgements, 0)
  })

  test('abandons rows claimed concurrently with shutdown before dispatch begins', async ({
    assert,
  }) => {
    const job = makeJob()
    const { repository, evidence } = makeRepository(job, () => Promise.resolve(true))
    let releaseClaim: ((jobs: DurableDomainEventJob[]) => void) | undefined
    let notifyClaimStarted: (() => void) | undefined
    const claimStarted = new Promise<void>((resolve) => {
      notifyClaimStarted = resolve
    })
    repository.claimBatch = () => {
      notifyClaimStarted?.()
      return new Promise<DurableDomainEventJob[]>((resolve) => {
        releaseClaim = resolve
      })
    }
    let dispatchCount = 0
    const shutdownController = new AbortController()
    const worker = new DomainEventOutboxWorker(
      workerOptions(repository, {
        dispatch: () => {
          dispatchCount += 1
          return Promise.resolve()
        },
      })
    )

    const run = worker.runOnce({ signal: shutdownController.signal })
    await claimStarted
    shutdownController.abort(new Error('test shutdown'))
    releaseClaim?.([job])
    const result = await run

    assert.equal(result.claimed, 1)
    assert.equal(result.aborted, 1)
    assert.equal(dispatchCount, 0)
    assert.lengthOf(evidence.acknowledgements, 0)
    assert.lengthOf(evidence.retries, 0)
    assert.lengthOf(evidence.deadLetters, 0)
  })
})
