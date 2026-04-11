import { test } from '@japa/runner'

import { getUserActivityLogRepository } from '#modules/user_activity/infra/repositories/user_activity_repository_provider'

test.group('User activity repository provider', () => {
  test('returns singleton postgres-backed repository instance', ({ assert }) => {
    const first = getUserActivityLogRepository()
    const second = getUserActivityLogRepository()

    assert.strictEqual(first, second)
    assert.property(first, 'create')
    assert.property(first, 'findByUser')
  })
})
