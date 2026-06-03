import { test } from '@japa/runner'

import {
  getHistoricalNotificationDefinition,
  getNotificationDefinition,
  isCanonicalNotificationType,
} from '#modules/notifications/domain/notification-feed/notification_catalog'
import { BACKEND_NOTIFICATION_TYPES } from '#modules/notifications/public_contracts/notification_constants'

test.group('Unit | Notification Catalog', () => {
  test('defines the complete enterprise contract for every producible type', ({ assert }) => {
    const types = [...new Set(Object.values(BACKEND_NOTIFICATION_TYPES))]

    for (const type of types) {
      const definition = getNotificationDefinition(type)

      assert.isDefined(definition, `Missing catalog definition for ${type}`)
      if (!definition) {
        continue
      }

      assert.equal(definition.type, type)
      assert.equal(definition.schemaVersion, 1)
      assert.isNotEmpty(definition.category)
      assert.include(['low', 'normal', 'high', 'urgent'], definition.priority)
      assert.isNotEmpty(definition.templateKey)
      assert.isAtLeast(definition.templateVersion, 1)
      assert.deepEqual(definition.allowedChannels, ['in_app'])
      assert.isFunction(definition.validateParameters)
      assert.isFunction(definition.resolveAction)
      assert.isNotEmpty(definition.retentionClass)
      assert.include(['mandatory', 'configurable'], definition.preferencePolicy)
    }
  })

  test('rejects unknown types for production but preserves an inert historical fallback', ({
    assert,
  }) => {
    const historicalType = 'removed_historical_notification'

    assert.isFalse(isCanonicalNotificationType(historicalType))
    assert.isUndefined(getNotificationDefinition(historicalType))
    assert.deepEqual(getHistoricalNotificationDefinition(historicalType), {
      type: historicalType,
      category: 'legacy',
      priority: 'normal',
      action: null,
      producible: false,
    })
  })

  test('keeps producer parameters out of action URL selection', ({ assert }) => {
    const definition = getNotificationDefinition(BACKEND_NOTIFICATION_TYPES.TASK_ASSIGNED)
    assert.isDefined(definition)
    if (!definition) {
      return
    }

    const action = definition.resolveAction({
      recipientId: 'recipient-1',
      scope: { kind: 'user', id: 'recipient-1' },
      subject: { type: 'task', id: 'task-1' },
      parameters: {
        url: 'https://attacker.example',
      },
    })

    assert.deepEqual(action, {
      routeName: 'tasks.show',
      params: { id: 'task-1' },
    })
  })

  test('classifies legacy-named organization events by domain rather than prefix', ({
    assert,
  }) => {
    const organizationTypes = [
      BACKEND_NOTIFICATION_TYPES.MEMBER_ADDED,
      BACKEND_NOTIFICATION_TYPES.JOIN_REQUEST_APPROVED,
      BACKEND_NOTIFICATION_TYPES.JOIN_REQUEST_REJECTED,
      BACKEND_NOTIFICATION_TYPES.MEMBER_REMOVED,
      BACKEND_NOTIFICATION_TYPES.OWNERSHIP_TRANSFERRED,
      BACKEND_NOTIFICATION_TYPES.ROLE_CHANGED,
    ]

    for (const type of organizationTypes) {
      assert.equal(getNotificationDefinition(type)?.category, 'organization', type)
    }
  })
})
