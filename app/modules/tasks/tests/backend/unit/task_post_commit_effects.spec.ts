import { test } from '@japa/runner'

import { settleTaskPostCommitEffects } from '#modules/tasks/actions/commands/internal/settle_task_post_commit_effects'

test.group('Task post-commit effect settlement', () => {
  test('preserves committed success and attempts every effect when one effect fails', async ({
    assert,
  }) => {
    const calls: string[] = []
    const logPayloads: Record<string, unknown>[] = []

    const report = await settleTaskPostCommitEffects({
      operation: 'task.status.update',
      context: { taskId: 'task-1' },
      logger: {
        error: (_message, payload) => {
          logPayloads.push(payload)
        },
      },
      effects: [
        {
          name: 'event.task_status_changed.task-1',
          run() {
            calls.push('event')
            return Promise.reject(new Error('event transport unavailable'))
          },
        },
        {
          name: 'cache.task.invalidate_now.task-1',
          run() {
            calls.push('cache')
            return Promise.resolve()
          },
        },
      ],
    })

    assert.sameMembers(calls, ['event', 'cache'])
    assert.equal(report.attempted, 2)
    assert.equal(report.succeeded, 1)
    assert.deepEqual(report.failures, [
      {
        effect: 'event.task_status_changed.task-1',
        errorType: 'Error',
      },
    ])
    assert.lengthOf(logPayloads, 1)
    assert.equal(logPayloads[0]?.['committed'], true)
    assert.notInclude(JSON.stringify(logPayloads), 'event transport unavailable')
  })

  test('does not retry non-idempotent in-process effects inside the request', async ({
    assert,
  }) => {
    let attempts = 0

    const report = await settleTaskPostCommitEffects({
      operation: 'task.delete',
      context: { taskId: 'task-2' },
      logger: { error: () => undefined },
      effects: [
        {
          name: 'event.task_deleted.task-2',
          run() {
            attempts += 1
            return Promise.reject(new Error('listener failed'))
          },
        },
      ],
    })

    assert.equal(attempts, 1)
    assert.equal(report.attempted, 1)
    assert.equal(report.succeeded, 0)
  })

  test('cannot turn a committed mutation into failure when telemetry logging fails', async ({
    assert,
  }) => {
    const report = await settleTaskPostCommitEffects({
      operation: 'task.time.update',
      context: { taskId: 'task-3' },
      logger: {
        error() {
          throw new Error('logger sink unavailable')
        },
      },
      effects: [
        {
          name: 'cache.task.invalidate_now.task-3',
          run() {
            return Promise.reject(new Error('redis unavailable'))
          },
        },
      ],
    })

    assert.equal(report.succeeded, 0)
    assert.equal(report.failures[0]?.effect, 'cache.task.invalidate_now.task-3')
  })
})
