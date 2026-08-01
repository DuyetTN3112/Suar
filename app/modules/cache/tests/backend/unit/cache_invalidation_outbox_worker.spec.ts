import { test } from '@japa/runner'

import type {
  CacheInvalidationOutboxClaimInput,
  CacheInvalidationOutboxFailureInput,
  CacheInvalidationOutboxHeartbeatInput,
  CacheInvalidationOutboxJob,
  CacheInvalidationOutboxLeaseMutationInput,
  CacheInvalidationOutboxRepository,
  CacheInvalidationOutboxRetryInput,
} from '#modules/cache/domain/cache_invalidation_outbox'
import {
  InvalidCacheInvalidationPayloadError,
  normalizeCacheInvalidationPatterns,
} from '#modules/cache/domain/cache_invalidation_outbox'
import { CacheInvalidationOutboxWorker } from '#modules/cache/infra/workers/cache_invalidation_outbox_worker'
import type { PlatformEvent } from '#modules/observability/public_contracts/platform_observability'

const baseTime = new Date('2026-07-23T00:00:00.000Z')

function makeJob(
  id: string,
  overrides: Partial<CacheInvalidationOutboxJob> = {}
): CacheInvalidationOutboxJob {
  return {
    id,
    sequence: 1,
    sourceTable: 'tasks',
    sourceOperation: 'UPDATE',
    sourcePrimaryKey: 'task-1',
    patterns: ['tasks:list:*'],
    attemptCount: 1,
    leaseToken: `lease-${id}`,
    lockedUntil: new Date(baseTime.getTime() + 60_000),
    ...overrides,
  }
}

class FakeRepository implements CacheInvalidationOutboxRepository {
  jobs: CacheInvalidationOutboxJob[] = []
  claims: CacheInvalidationOutboxClaimInput[] = []
  heartbeats: CacheInvalidationOutboxHeartbeatInput[] = []
  acknowledgements: CacheInvalidationOutboxLeaseMutationInput[] = []
  retries: CacheInvalidationOutboxRetryInput[] = []
  deadLetters: CacheInvalidationOutboxFailureInput[] = []
  heartbeatResult = true
  acknowledgeResult = true
  retryResult = true
  deadLetterResult = true

  claimBatch(input: CacheInvalidationOutboxClaimInput): Promise<CacheInvalidationOutboxJob[]> {
    this.claims.push(input)
    return Promise.resolve(this.jobs.splice(0))
  }

  heartbeat(input: CacheInvalidationOutboxHeartbeatInput): Promise<boolean> {
    this.heartbeats.push(input)
    return Promise.resolve(this.heartbeatResult)
  }

  acknowledge(input: CacheInvalidationOutboxLeaseMutationInput): Promise<boolean> {
    this.acknowledgements.push(input)
    return Promise.resolve(this.acknowledgeResult)
  }

  retry(input: CacheInvalidationOutboxRetryInput): Promise<boolean> {
    this.retries.push(input)
    return Promise.resolve(this.retryResult)
  }

  deadLetter(input: CacheInvalidationOutboxFailureInput): Promise<boolean> {
    this.deadLetters.push(input)
    return Promise.resolve(this.deadLetterResult)
  }
}

test.group('Cache invalidation outbox contract', () => {
  test('normalizes, sorts, and deduplicates logical Redis patterns', ({ assert }) => {
    assert.deepEqual(normalizeCacheInvalidationPatterns(['z:*', 'a:*', 'z:*']), ['a:*', 'z:*'])
  })

  test('rejects physical prefixes and malformed payloads', ({ assert }) => {
    assert.throws(
      () => normalizeCacheInvalidationPatterns(['suar:cache:tasks:list:*']),
      InvalidCacheInvalidationPayloadError
    )
    assert.throws(
      () => normalizeCacheInvalidationPatterns(['valid:*', 42]),
      InvalidCacheInvalidationPayloadError
    )
    assert.throws(
      () => normalizeCacheInvalidationPatterns([]),
      InvalidCacheInvalidationPayloadError
    )
  })
})

test.group('CacheInvalidationOutboxWorker', () => {
  test('invalidates every unique pattern before acknowledging the fenced lease', async ({
    assert,
  }) => {
    const repository = new FakeRepository()
    repository.jobs.push(
      makeJob('success', { patterns: ['tasks:list:*', 'task:detail:1:*', 'tasks:list:*'] })
    )
    const deleted: string[] = []
    const worker = new CacheInvalidationOutboxWorker({
      repository,
      invalidator: {
        deleteByPattern: (pattern) => {
          deleted.push(pattern)
          return Promise.resolve()
        },
      },
      workerId: 'worker-success',
      now: () => baseTime,
    })

    const result = await worker.runOnce()

    assert.deepEqual(deleted, ['task:detail:1:*', 'tasks:list:*'])
    assert.deepEqual(result, {
      claimed: 1,
      processed: 1,
      retried: 0,
      deadLettered: 0,
      leaseLost: 0,
    })
    assert.lengthOf(repository.acknowledgements, 1)
    assert.equal(repository.acknowledgements[0]?.leaseToken, 'lease-success')
  })

  test('retries transient Redis failures with bounded exponential backoff and redaction', async ({
    assert,
  }) => {
    const repository = new FakeRepository()
    repository.jobs.push(makeJob('retry', { attemptCount: 3 }))
    const worker = new CacheInvalidationOutboxWorker({
      repository,
      invalidator: {
        deleteByPattern: () => {
          throw new Error('redis password=hunter2 token=secret-value unavailable')
        },
      },
      workerId: 'worker-retry',
      now: () => baseTime,
      random: () => 0.5,
      retryBaseMs: 1_000,
      retryCapMs: 300_000,
    })

    const result = await worker.runOnce()

    assert.equal(result.retried, 1)
    assert.lengthOf(repository.retries, 1)
    assert.equal(repository.retries[0]?.availableAt.getTime(), baseTime.getTime() + 4_000)
    assert.notInclude(repository.retries[0]?.errorMessage ?? '', 'hunter2')
    assert.notInclude(repository.retries[0]?.errorMessage ?? '', 'secret-value')
  })

  test('dead-letters poison payloads without touching Redis', async ({ assert }) => {
    const repository = new FakeRepository()
    repository.jobs.push(makeJob('poison', { patterns: ['valid:*', 42] }))
    let invalidationCalls = 0
    const worker = new CacheInvalidationOutboxWorker({
      repository,
      invalidator: {
        deleteByPattern: () => {
          invalidationCalls += 1
          return Promise.resolve()
        },
      },
      workerId: 'worker-poison',
      now: () => baseTime,
    })

    const result = await worker.runOnce()

    assert.equal(result.deadLettered, 1)
    assert.equal(invalidationCalls, 0)
    assert.equal(repository.deadLetters[0]?.errorClass, 'InvalidCacheInvalidationPayloadError')
  })

  test('dead-letters an exhausted transient failure', async ({ assert }) => {
    const repository = new FakeRepository()
    repository.jobs.push(makeJob('exhausted', { attemptCount: 10 }))
    const worker = new CacheInvalidationOutboxWorker({
      repository,
      invalidator: {
        deleteByPattern: () => Promise.reject(new Error('redis unavailable')),
      },
      workerId: 'worker-exhausted',
      now: () => baseTime,
      maxAttempts: 10,
    })

    const result = await worker.runOnce()

    assert.equal(result.deadLettered, 1)
    assert.lengthOf(repository.retries, 0)
    assert.lengthOf(repository.deadLetters, 1)
  })

  test('reports lease loss instead of acknowledging another worker lease', async ({ assert }) => {
    const repository = new FakeRepository()
    repository.jobs.push(makeJob('fenced'))
    repository.acknowledgeResult = false
    const events: PlatformEvent[] = []
    const worker = new CacheInvalidationOutboxWorker({
      repository,
      invalidator: {
        deleteByPattern: () => Promise.resolve(),
      },
      workerId: 'worker-fenced',
      now: () => baseTime,
      operationalLogger: {
        log: (_level, event) => {
          events.push(event)
          throw new Error('telemetry sink unavailable')
        },
      },
    })

    const result = await worker.runOnce()

    assert.equal(result.leaseLost, 1)
    assert.equal(result.processed, 0)
    assert.equal(events[0]?.event_name, 'cache.invalidation_outbox.lease_lost')
    assert.equal(events[0]?.stage, 'acknowledge_rejected')
    assert.isNull(events[0]?.error)
    assert.notInclude(JSON.stringify(events), 'task-1')
    assert.notInclude(JSON.stringify(events), 'tasks:list:*')
  })

  test('isolates a poison row from later rows in the claimed batch', async ({ assert }) => {
    const repository = new FakeRepository()
    repository.jobs.push(
      makeJob('poison-first', { sequence: 1, patterns: [false] }),
      makeJob('valid-second', { sequence: 2, patterns: ['tasks:list:*'] })
    )
    const deleted: string[] = []
    const worker = new CacheInvalidationOutboxWorker({
      repository,
      invalidator: {
        deleteByPattern: (pattern) => {
          deleted.push(pattern)
          return Promise.resolve()
        },
      },
      workerId: 'worker-isolation',
      now: () => baseTime,
      concurrency: 2,
    })

    const result = await worker.runOnce()

    assert.equal(result.deadLettered, 1)
    assert.equal(result.processed, 1)
    assert.deepEqual(deleted, ['tasks:list:*'])
  })

  test('coalesces duplicate pattern scans within one claimed batch while ACKing each row', async ({
    assert,
  }) => {
    const repository = new FakeRepository()
    repository.jobs.push(
      makeJob('first', {
        sequence: 1,
        patterns: ['tasks:list:*', 'task:metadata:*'],
      }),
      makeJob('second', {
        sequence: 2,
        patterns: ['tasks:list:*'],
      })
    )
    const calls: string[] = []
    const worker = new CacheInvalidationOutboxWorker({
      repository,
      invalidator: {
        deleteByPattern: (pattern) => {
          calls.push(pattern)
          return Promise.resolve()
        },
      },
      workerId: 'worker-coalesced',
      now: () => baseTime,
      concurrency: 2,
    })

    const result = await worker.runOnce()

    assert.deepEqual(calls.sort(), ['task:metadata:*', 'tasks:list:*'])
    assert.equal(result.processed, 2)
    assert.lengthOf(repository.acknowledgements, 2)
  })

  test('heartbeats jobs waiting behind a slow scan before their processing starts', async ({
    assert,
  }) => {
    const repository = new FakeRepository()
    repository.jobs.push(
      makeJob('slow-first', { sequence: 1, patterns: ['slow:*'] }),
      makeJob('waiting-second', { sequence: 2, patterns: ['waiting:*'] })
    )
    let releaseSlowScan: (() => void) | undefined
    const slowScan = new Promise<void>((resolve) => {
      releaseSlowScan = resolve
    })
    const worker = new CacheInvalidationOutboxWorker({
      repository,
      invalidator: {
        deleteByPattern: (pattern) => (pattern === 'slow:*' ? slowScan : Promise.resolve()),
      },
      workerId: 'worker-heartbeat-waiting',
      now: () => baseTime,
      concurrency: 1,
      leaseDurationMs: 1_000,
      heartbeatIntervalMs: 100,
    })

    const run = worker.runOnce()
    await new Promise((resolve) => setTimeout(resolve, 125))
    releaseSlowScan?.()
    const result = await run

    assert.equal(result.processed, 2)
    assert.isTrue(repository.heartbeats.some((heartbeat) => heartbeat.jobId === 'slow-first'))
    assert.isTrue(repository.heartbeats.some((heartbeat) => heartbeat.jobId === 'waiting-second'))
  })
})
