import { test } from '@japa/runner'

import {
  BoundedErrorEventReporter,
  type CreateErrorEventPayload,
} from '#modules/errors/infra/repositories/error_event_repository'

function payload(): CreateErrorEventPayload {
  return {
    code: 'E_INTERNAL_ERROR',
    status: 500,
    severity: 'error',
    message: 'Internal diagnostic',
    safe_message: 'Safe diagnostic',
    details: null,
    request_id: null,
    correlation_id: null,
    actor_user_id: null,
    actor_org_id: null,
    method: 'GET',
    url: '/test',
    ip_address: null,
    user_agent: null,
  }
}

async function flushPromises(): Promise<void> {
  await new Promise<void>((resolve) => {
    setImmediate(resolve)
  })
}

test.group('Bounded error-event reporter', () => {
  test('drops excess events instead of building an unbounded outage queue', async ({ assert }) => {
    let release!: () => void
    const pendingWrite = new Promise<void>((resolve) => {
      release = resolve
    })
    const drops: string[] = []
    const reporter = new BoundedErrorEventReporter(() => pendingWrite, {
      maxInFlight: 1,
      circuitOpenMs: 1_000,
      onDrop: (reason) => drops.push(reason),
    })

    assert.equal(reporter.enqueue(payload()), 'accepted')
    assert.equal(reporter.enqueue(payload()), 'capacity_exhausted')
    assert.deepEqual(drops, ['capacity_exhausted'])

    release()
    await flushPromises()
    assert.equal(reporter.enqueue(payload()), 'accepted')
  })

  test('opens a circuit after persistence failure and probes again after cooldown', async ({
    assert,
  }) => {
    let now = 1_000
    let shouldFail = true
    const failures: unknown[] = []
    const reporter = new BoundedErrorEventReporter(
      () => {
        if (shouldFail) {
          return Promise.reject(new Error('database unavailable'))
        }
        return Promise.resolve()
      },
      {
        maxInFlight: 1,
        circuitOpenMs: 5_000,
        now: () => now,
        onWriteFailure: (error) => failures.push(error),
      }
    )

    assert.equal(reporter.enqueue(payload()), 'accepted')
    await flushPromises()
    assert.lengthOf(failures, 1)
    assert.equal(reporter.enqueue(payload()), 'circuit_open')

    now += 5_001
    shouldFail = false
    assert.equal(reporter.enqueue(payload()), 'accepted')
    await flushPromises()
    assert.equal(reporter.enqueue(payload()), 'accepted')
  })

  test('stops admission and drains accepted writes during graceful shutdown', async ({
    assert,
  }) => {
    let release!: () => void
    const pendingWrite = new Promise<void>((resolve) => {
      release = resolve
    })
    const reporter = new BoundedErrorEventReporter(() => pendingWrite, {
      maxInFlight: 1,
      circuitOpenMs: 1_000,
    })

    assert.equal(reporter.enqueue(payload()), 'accepted')
    const drain = reporter.closeAndDrain(100)
    assert.equal(reporter.enqueue(payload()), 'shutting_down')
    release()

    assert.equal(await drain, 'drained')
  })

  test('bounds graceful shutdown when an accepted writer does not settle', async ({ assert }) => {
    const reporter = new BoundedErrorEventReporter(
      () => new Promise<void>(() => {}),
      {
        maxInFlight: 1,
        circuitOpenMs: 1_000,
      }
    )

    assert.equal(reporter.enqueue(payload()), 'accepted')
    assert.equal(await reporter.closeAndDrain(5), 'timed_out')
    assert.equal(reporter.enqueue(payload()), 'shutting_down')
  })
})
