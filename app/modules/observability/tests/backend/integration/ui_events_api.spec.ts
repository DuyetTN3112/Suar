import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData, OrganizationFactory } from '#tests/helpers/factories'

test.group('Integration | UI Events API', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('accepts shared frontend ui telemetry payloads', async ({ client }) => {
    const { owner } = await OrganizationFactory.createWithOwner()

    const response = await client
      .post('/api/telemetry/ui-events')
      .json({
        eventName: 'notifications.ui.item_clicked',
        module: 'notifications',
        subsystem: 'notification_dropdown',
        workflow: 'notification_dropdown',
        eventFamily: 'ui',
        surface: 'notification_dropdown',
        frontendSubmissionId: 'session-1',
        targetType: 'notification',
        targetId: 'notification-1',
        metadata: {
          notification_type: 'task_assigned',
        },
        persist: true,
      })
      .loginAs(owner)

    response.assertStatus(204)
  })
})
