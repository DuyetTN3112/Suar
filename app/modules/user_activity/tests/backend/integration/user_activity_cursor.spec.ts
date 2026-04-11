import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { getUserActivityLogRepository } from '#modules/user_activity/infra/repositories/user_activity_repository_provider'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, UserFactory } from '#tests/helpers/factories'

test.group('Integration | User Activity Cursor Pagination', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('returns older and newer activity windows without overlap', async ({ assert }) => {
    const user = await UserFactory.create()
    const repo = getUserActivityLogRepository()
    const baseTime = DateTime.fromISO('2026-07-05T16:00:00.000Z')

    for (let index = 0; index < 4; index++) {
      await repo.create({
        user_id: user.id,
        action_type: 'login',
        action_data: { index },
        ip_address: '127.0.0.1',
        user_agent: 'test-agent',
      })
    }

    const allRows = await repo.findByUser(user.id, { limit: 10, page: 1 })
    for (const [index, row] of allRows.data.entries()) {
      await db
        .from('user_activity_events')
        .where('id', row.id)
        .update({
          created_at: baseTime.minus({ minutes: index }).toISO(),
        })
    }

    const firstWindow = await repo.findByUserCursor(user.id, { limit: 2 })

    assert.lengthOf(firstWindow.data, 2)
    assert.isTrue(firstWindow.hasNextPage)
    assert.isFalse(firstWindow.hasPreviousPage)
    assert.isString(firstWindow.nextCursor)

    const secondWindow = await repo.findByUserCursor(user.id, {
      limit: 2,
      after: firstWindow.nextCursor,
    })

    assert.lengthOf(secondWindow.data, 2)
    assert.isTrue(secondWindow.hasPreviousPage)
    assert.isFalse(secondWindow.hasNextPage)
    assert.equal(
      secondWindow.data.filter((item) => firstWindow.data.some((first) => first.id === item.id))
        .length,
      0
    )

    const newerWindow = await repo.findByUserCursor(user.id, {
      limit: 2,
      before: secondWindow.previousCursor,
    })

    assert.deepEqual(
      newerWindow.data.map((item) => item.id),
      firstWindow.data.map((item) => item.id)
    )
    assert.isFalse(newerWindow.hasPreviousPage)
    assert.isTrue(newerWindow.hasNextPage)
  })
})
