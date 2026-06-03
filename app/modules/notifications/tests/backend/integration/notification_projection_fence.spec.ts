import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import {
  acquireNotificationProjectionCutoverFence,
  acquireNotificationProjectionWriterFence,
} from '#modules/notifications/infra/repositories/notification-outbox/notification_projection_fence'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'

function nextTurn(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve)
  })
}

test.group('Integration | Notification Projection Fence', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())

  test('exclusive watermark fence waits for an in-flight notification writer', async ({
    assert,
  }) => {
    const writer = await db.transaction()
    await acquireNotificationProjectionWriterFence(writer)
    const state = { cutoverAcquired: false }
    const cutover = db.transaction(async (trx) => {
      await acquireNotificationProjectionCutoverFence(trx)
      state.cutoverAcquired = true
    })

    await nextTurn()
    assert.isFalse(state.cutoverAcquired)

    await writer.commit()
    await cutover
    assert.isTrue(state.cutoverAcquired)
  })
})
