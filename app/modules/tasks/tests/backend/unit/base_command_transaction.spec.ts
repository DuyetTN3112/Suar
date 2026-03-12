import { test } from '@japa/runner'

import { BaseCommand } from '#modules/tasks/actions/base_command'
import type {
  TaskTransaction,
  TaskTransactionRunner,
} from '#modules/tasks/actions/ports/outbound/task_transaction'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

type TransactionInvoker = <T>(
  callback: (trx: TaskTransaction) => Promise<T>
) => Promise<T>

class TestCommand extends BaseCommand<{ fail?: boolean }, string> {
  handle(input: { fail?: boolean }): Promise<string> {
    if (input.fail) {
      return Promise.reject(new Error('command failed'))
    }

    return Promise.resolve('ok')
  }

  async runInTransaction<T>(
    callback: (trx: TaskTransaction) => Promise<T>
  ): Promise<T> {
    return await this.executeInTransaction(callback)
  }
}

function makeExecCtx(userId: string | null = VALID_UUID): TaskActionContext {
  return {
    userId,
    ip: '127.0.0.1',
    userAgent: 'test',
    organizationId: VALID_UUID_2,
  }
}

function makeTransaction(): TaskTransaction {
  return { transactionMarker: 'unit-test' }
}

function transactionRunner(transaction: TransactionInvoker): TaskTransactionRunner {
  return { run: transaction }
}

test.group('BaseCommand transaction contract', () => {
  test('delegates transaction execution to db.transaction and forwards callback result', async ({
    assert,
  }) => {
    const trx = makeTransaction()
    const calls: string[] = []
    const command = new TestCommand(
      makeExecCtx(),
      transactionRunner(async (callback) => {
        calls.push('transaction')
        return callback(trx)
      })
    )
    const result = await command.runInTransaction((incomingTrx) => {
      calls.push('callback')
      assert.equal(incomingTrx, trx)
      return Promise.resolve('done')
    })

    assert.equal(result, 'done')
    assert.deepEqual(calls, ['transaction', 'callback'])
  })

  test('propagates callback failures from executeInTransaction', async ({ assert }) => {
    const trx = makeTransaction()
    const command = new TestCommand(
      makeExecCtx(),
      transactionRunner((callback) => callback(trx))
    )

    await assert.rejects(
      () => command.runInTransaction(() => Promise.reject(new Error('inner failure'))),
      /inner failure/
    )
  })

  test('executeAndWrap returns failure result when command handle throws', async ({ assert }) => {
    const command = new TestCommand(
      makeExecCtx(),
      transactionRunner((callback) => callback(makeTransaction()))
    )

    const wrapped = await command.executeAndWrap({ fail: true })

    assert.isTrue(wrapped.isFailure())
    assert.instanceOf(wrapped.error, Error)
    assert.equal((wrapped.error as Error | null)?.message, 'command failed')
  })
})
