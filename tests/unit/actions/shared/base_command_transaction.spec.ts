import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { test } from '@japa/runner'

import { BaseCommand } from '#actions/shared/base_command'
import type { ExecutionContext } from '#types/execution_context'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

type TransactionInvoker = <T>(
  callback: (trx: TransactionClientContract) => Promise<T>
) => Promise<T>

class TestCommand extends BaseCommand<{ fail?: boolean }, string> {
  handle(input: { fail?: boolean }): Promise<string> {
    if (input.fail) {
      return Promise.reject(new Error('command failed'))
    }

    return Promise.resolve('ok')
  }

  async runInTransaction<T>(
    callback: (trx: TransactionClientContract) => Promise<T>
  ): Promise<T> {
    return await this.executeInTransaction(callback)
  }
}

function makeExecCtx(userId: string | null = VALID_UUID): ExecutionContext {
  return {
    userId,
    ip: '127.0.0.1',
    userAgent: 'test',
    organizationId: VALID_UUID_2,
  }
}

function makeTransaction(): TransactionClientContract {
  const trx = {
    commit: () => Promise.resolve(),
    rollback: () => Promise.resolve(),
  }

  // @ts-expect-error - partial transaction client mock for unit tests
  return trx
}

test.group('BaseCommand transaction contract', () => {
  test('delegates transaction execution to db.transaction and forwards callback result', async ({
    assert,
  }) => {
    const command = new TestCommand(makeExecCtx())
    const dbService = db as unknown as { transaction: TransactionInvoker }
    const originalTransaction = dbService.transaction
    const trx = makeTransaction()
    const calls: string[] = []

    dbService.transaction = async (callback) => {
      calls.push('transaction')
      return await callback(trx)
    }

    try {
      const result = await command.runInTransaction((incomingTrx) => {
        calls.push('callback')
        assert.equal(incomingTrx, trx)
        return Promise.resolve('done')
      })

      assert.equal(result, 'done')
      assert.deepEqual(calls, ['transaction', 'callback'])
    } finally {
      dbService.transaction = originalTransaction
    }
  })

  test('propagates callback failures from executeInTransaction', async ({ assert }) => {
    const command = new TestCommand(makeExecCtx())
    const dbService = db as unknown as { transaction: TransactionInvoker }
    const originalTransaction = dbService.transaction
    const trx = makeTransaction()

    dbService.transaction = async (callback) => {
      return await callback(trx)
    }

    try {
      await assert.rejects(
        () =>
          command.runInTransaction(() => Promise.reject(new Error('inner failure'))),
        /inner failure/
      )
    } finally {
      dbService.transaction = originalTransaction
    }
  })

  test('executeAndWrap returns failure result when command handle throws', async ({ assert }) => {
    const command = new TestCommand(makeExecCtx())

    const wrapped = await command.executeAndWrap({ fail: true })

    assert.isTrue(wrapped.isFailure())
    assert.instanceOf(wrapped.error, Error)
    assert.equal((wrapped.error as Error | null)?.message, 'command failed')
  })
})
