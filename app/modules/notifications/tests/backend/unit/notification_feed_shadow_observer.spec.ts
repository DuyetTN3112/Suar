import { test } from '@japa/runner'

import { NotificationFeedShadowObserver } from '#modules/notifications/observability/notification_feed_shadow_observer'

test.group('Unit | Notification Feed Shadow Observer', () => {
  test('emits bounded mismatch telemetry without a raw recipient identifier', ({ assert }) => {
    const logs: Array<{
      level: string
      eventName: string
      payload: Record<string, unknown>
    }> = []
    const observer = new NotificationFeedShadowObserver((level, eventName, payload) => {
      logs.push({ level, eventName, payload })
    })

    observer.observe({
      recipientId: '11111111-1111-4111-8111-111111111111',
      canonicalIds: Array.from({ length: 20 }, (_, index) => `canonical-${index}`),
      searchIds: [],
      matches: false,
      classification: 'unexplained_mismatch',
      missingIds: Array.from({ length: 20 }, (_, index) => `missing-${index}`),
      extraIds: [],
      staleIds: [],
      stateMismatchIds: [],
      searchAheadIds: [],
      hasNextPageMatches: false,
    })

    assert.lengthOf(logs, 1)
    assert.equal(logs[0]?.level, 'warn')
    assert.equal(
      logs[0]?.eventName,
      'notifications.feed.shadow.unexplained_mismatch'
    )
    assert.notEqual(
      logs[0]?.payload['recipient_hash'],
      '11111111-1111-4111-8111-111111111111'
    )
    assert.notProperty(logs[0]?.payload ?? {}, 'recipient_id')
    const samples = logs[0]?.payload['samples'] as { missing: string[] }
    assert.lengthOf(samples.missing, 10)
  })
})
