import { test } from '@japa/runner'

import { rollbackWithoutMaskingOriginalError } from '#modules/logger/public_contracts/transaction_rollback'

test.group('Unit | Transaction rollback exception integrity', () => {
  test('reports a rollback failure without exposing either error message', async ({ assert }) => {
    const originalError = new Error('primary secret')
    const rollbackError = new Error('rollback secret')
    const events: Array<{ eventName: string; payload: Record<string, unknown> }> = []

    const outcome = await rollbackWithoutMaskingOriginalError(
      {
        isCompleted: false,
        rollback: () => Promise.reject(rollbackError),
      },
      originalError,
      {
        module: 'reviews',
        operation: 'create_review_dispute',
      },
      {
        logStructured: (_level, eventName, payload) => {
          events.push({ eventName, payload })
        },
      }
    )

    assert.equal(outcome, 'rollback_failed')
    assert.lengthOf(events, 1)
    const event = events[0]
    assert.isDefined(event)
    if (event === undefined) {
      return
    }
    assert.equal(event.eventName, 'database.transaction.rollback_failed')
    assert.equal(event.payload['original_error_class'], 'Error')
    assert.equal(event.payload['rollback_error_class'], 'Error')
    assert.notInclude(JSON.stringify(event), 'primary secret')
    assert.notInclude(JSON.stringify(event), 'rollback secret')
  })

  test('keeps the original error identity when rollback and telemetry fail', async ({ assert }) => {
    const originalError = new Error('primary')

    const execute = async () => {
      try {
        throw originalError
      } catch (error) {
        await rollbackWithoutMaskingOriginalError(
          {
            isCompleted: false,
            rollback: () => Promise.reject(new Error('rollback')),
          },
          error,
          {
            module: 'organizations',
            operation: 'create_organization',
          },
          {
            logStructured: () => {
              throw new Error('sink unavailable')
            },
          }
        )
        throw error
      }
    }

    try {
      await execute()
      assert.fail('Expected the original error to be rethrown')
    } catch (error) {
      assert.strictEqual(error, originalError)
    }
  })

  test('skips an already completed transaction', async ({ assert }) => {
    let rollbackCalls = 0

    const outcome = await rollbackWithoutMaskingOriginalError(
      {
        isCompleted: true,
        rollback: () => {
          rollbackCalls += 1
          return Promise.resolve()
        },
      },
      new Error('primary'),
      {
        module: 'sprints',
        operation: 'update_project_sprint',
      }
    )

    assert.equal(outcome, 'already_completed')
    assert.equal(rollbackCalls, 0)
  })

  test('reports a successful rollback', async ({ assert }) => {
    let rollbackCalls = 0

    const outcome = await rollbackWithoutMaskingOriginalError(
      {
        isCompleted: false,
        rollback: () => {
          rollbackCalls += 1
          return Promise.resolve()
        },
      },
      new Error('primary'),
      {
        module: 'skills',
        operation: 'publish_skill_rubric',
      }
    )

    assert.equal(outcome, 'rolled_back')
    assert.equal(rollbackCalls, 1)
  })
})
