import { test } from '@japa/runner'

import { BaseCommand } from '#modules/projects/actions/base_command'
import type { ProjectTransactionRunner } from '#modules/projects/actions/ports/outbound/project_transaction'

class TestPostCommitCommand extends BaseCommand<{
  effect: () => Promise<void>
}> {
  handle(input: { effect: () => Promise<void> }): Promise<void> {
    return this.settlePostCommitEffect('project.updated', input.effect, {
      projectId: 'f79ed770-b2f5-488e-95fe-5919854351de',
      actorId: '2da73e64-2a7a-4e52-97e1-334d14881cd8',
    })
  }
}

test.group('Project post-commit effects', () => {
  test('preserves committed success when an event publisher fails', async ({ assert }) => {
    let calls = 0
    const transactions: ProjectTransactionRunner = {
      run: async (callback) => callback({}),
    }
    const command = new TestPostCommitCommand(
      {
        userId: null,
        ip: '127.0.0.1',
        userAgent: 'unit-test',
        organizationId: null,
      },
      transactions
    )

    await assert.doesNotReject(() =>
      command.handle({
        effect: () => {
          calls += 1
          return Promise.reject(new Error('event bus unavailable'))
        },
      })
    )

    assert.equal(calls, 1)
  })
})
