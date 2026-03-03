import { test } from '@japa/runner'

import { notificationApplication as notificationPublicApi } from '#composition/notification_composition'
import { BACKEND_NOTIFICATION_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'

test.group('Contract | Notification API standardization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('legacy latest notifications endpoint returns wrapped camelCase notification payload', async ({
    assert,
    client,
  }) => {
    const user = await UserFactory.create({ username: 'notification_contract_latest' })

    await notificationPublicApi.handle({
      user_id: user.id,
      title: 'Contract notification',
      message: 'Latest payload should be canonical',
      type: BACKEND_NOTIFICATION_TYPES.INFO,
      related_entity_type: 'task',
      related_entity_id: 'task-contract',
    })

    const response = await client.get('/notifications/latest').loginAs(user)
    response.assertStatus(200)

    const body = response.body() as {
      data: Record<string, unknown>[]
      recipientId: string
      unreadCount: number
      recipientStateRevision: number
      pagination: Record<string, unknown>
    }

    assert.isArray(body.data)
    assert.isAbove(body.data.length, 0)
    assert.equal(body.recipientId, user.id)
    assert.equal(body.unreadCount, 1)
    assert.equal(body.recipientStateRevision, 1)
    assert.properties(body.pagination, [
      'mode',
      'nextCursor',
      'previousCursor',
      'hasNextPage',
      'hasPreviousPage',
    ])
    assert.notProperty(body, 'notifications')
    assert.notProperty(body, 'unread_count')

    const notification = body.data[0]
    if (!notification) {
      throw new Error('Expected latest notification item')
    }
    assert.properties(notification, [
      'id',
      'userId',
      'title',
      'message',
      'isRead',
      'type',
      'relatedEntityType',
      'relatedEntityId',
      'createdAt',
      'updatedAt',
      'readAt',
      'eventId',
      'schemaVersion',
      'category',
      'priority',
      'action',
      'revision',
      'occurredAt',
    ])
    assert.notProperty(notification, 'user_id')
    assert.notProperty(notification, 'is_read')
    assert.notProperty(notification, 'related_entity_type')
    assert.notProperty(notification, 'created_at')
  })

  test('v1 notifications list endpoint uses same camelCase item contract with pagination', async ({
    assert,
    client,
  }) => {
    const user = await UserFactory.create({ username: 'notification_contract_v1' })

    await notificationPublicApi.handle({
      user_id: user.id,
      title: 'V1 notification',
      message: 'V1 list should be canonical',
      type: BACKEND_NOTIFICATION_TYPES.INFO,
    })

    const response = await client.get('/api/v1/notifications').loginAs(user)
    response.assertStatus(200)

    const body = response.body() as {
      data: Record<string, unknown>[]
      pagination: Record<string, unknown>
      recipientId: string
      unreadCount: number
      recipientStateRevision: number
    }

    assert.isArray(body.data)
    assert.isAbove(body.data.length, 0)
    assert.properties(body.pagination, ['page', 'perPage', 'total', 'hasNextPage'])
    assert.equal(body.recipientId, user.id)
    assert.equal(body.unreadCount, 1)
    assert.equal(body.recipientStateRevision, 1)
    const firstNotification = body.data[0]
    if (!firstNotification) {
      throw new Error('Expected v1 notification item')
    }
    assert.properties(firstNotification, ['userId', 'isRead', 'createdAt', 'updatedAt'])
  })

  test('v1 notification cursor advances without duplicating the boundary item', async ({
    assert,
    client,
  }) => {
    const user = await UserFactory.create({ username: 'notification_contract_cursor' })

    for (const suffix of ['first', 'second', 'third']) {
      await notificationPublicApi.handle({
        user_id: user.id,
        title: `Cursor ${suffix}`,
        message: `Cursor payload ${suffix}`,
        type: BACKEND_NOTIFICATION_TYPES.INFO,
      })
    }

    const firstResponse = await client
      .get('/api/v1/notifications')
      .qs({ perPage: 1 })
      .loginAs(user)
    firstResponse.assertStatus(200)
    const firstBody = firstResponse.body() as {
      data: Array<{ id: string }>
      pagination: {
        mode: string
        nextCursor: string | null
        hasNextPage: boolean
      }
    }
    assert.equal(firstBody.pagination.mode, 'cursor')
    assert.isTrue(firstBody.pagination.hasNextPage)
    assert.isString(firstBody.pagination.nextCursor)

    const secondResponse = await client
      .get('/api/v1/notifications')
      .qs({ perPage: 1, after: firstBody.pagination.nextCursor })
      .loginAs(user)
    secondResponse.assertStatus(200)
    const secondBody = secondResponse.body() as {
      data: Array<{ id: string }>
      pagination: { previousCursor: string | null }
    }

    assert.lengthOf(firstBody.data, 1)
    assert.lengthOf(secondBody.data, 1)
    assert.notEqual(firstBody.data[0]?.id, secondBody.data[0]?.id)
    assert.isString(secondBody.pagination.previousCursor)
  })

  test('notification mutation endpoints return 204 without success envelopes', async ({ client }) => {
    const user = await UserFactory.create({ username: 'notification_contract_mutations' })

    const first = await notificationPublicApi.handle({
      user_id: user.id,
      title: 'Mark one',
      message: 'Mutation 204 one',
      type: BACKEND_NOTIFICATION_TYPES.INFO,
    })
    const second = await notificationPublicApi.handle({
      user_id: user.id,
      title: 'Delete one',
      message: 'Mutation 204 two',
      type: BACKEND_NOTIFICATION_TYPES.INFO,
    })
    const firstId = first?.id
    if (!firstId) {
      throw new Error('Expected first notification id')
    }

    const markOneResponse = await client
      .post(`/notifications/${firstId}/mark-as-read`)
      .loginAs(user)
    markOneResponse.assertStatus(204)

    const markAllResponse = await client.post('/notifications/mark-all-as-read').loginAs(user)
    markAllResponse.assertStatus(204)

    const secondId = second?.id
    if (!secondId) {
      throw new Error('Expected second notification id')
    }

    const deleteOneResponse = await client.delete(`/notifications/${secondId}`).loginAs(user)
    deleteOneResponse.assertStatus(204)

    const deleteAllResponse = await client.delete('/notifications').loginAs(user)
    deleteAllResponse.assertStatus(204)
  })
})
