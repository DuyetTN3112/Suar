import { test } from '@japa/runner'

import { BaseCommand } from '#modules/reviews/actions/base_command'

class TestPostCommitCommand extends BaseCommand<{
  effect: () => Promise<void>
}> {
  handle(input: { effect: () => Promise<void> }): Promise<void> {
    return this.settlePostCommitEffect('review.dispute.resolved', input.effect, {
      entityId: 'f79ed770-b2f5-488e-95fe-5919854351de',
      actorId: '2da73e64-2a7a-4e52-97e1-334d14881cd8',
    })
  }
}

test.group('Review post-commit effects', () => {
  test('preserves committed success when a downstream event listener fails', async ({ assert }) => {
    let calls = 0
    const command = new TestPostCommitCommand({
      userId: null,
      ip: '127.0.0.1',
      userAgent: 'unit-test',
      organizationId: null,
    })

    await assert.doesNotReject(() =>
      command.handle({
        effect: () => {
          calls += 1
          return Promise.reject(new Error('listener unavailable'))
        },
      })
    )

    assert.equal(calls, 1)
  })
})
