import { test } from '@japa/runner'

import type { NotificationCommandV1 } from '#modules/notifications/domain/notification-feed/notification_command'
import { renderNotificationSnapshot } from '#modules/notifications/domain/notification-feed/notification_renderer'

function command(parameters: Record<string, string>): NotificationCommandV1 {
  return {
    eventId: 'event-1',
    type: 'organization_join_request',
    schemaVersion: 1,
    recipientId: 'recipient-1',
    scope: { kind: 'organization', id: 'org-1' },
    actor: { type: 'user', id: 'requester-1' },
    subject: { type: 'organization', id: 'org-1' },
    parameters,
    occurredAt: '2026-08-10T00:00:00.000Z',
  }
}

test.group('Unit | Notification Renderer', () => {
  test('identifies the requester in an organization join-request notification', ({ assert }) => {
    const snapshot = renderNotificationSnapshot(
      command({ organizationName: 'Suar Product Studio', requesterName: 'duyet' })
    )

    assert.equal(snapshot.title, 'Yêu cầu tham gia tổ chức mới')
    assert.equal(
      snapshot.message,
      'duyet đã gửi yêu cầu tham gia tổ chức "Suar Product Studio".'
    )
  })

  test('keeps the organization-only copy for historical notifications without requesterName', ({
    assert,
  }) => {
    const snapshot = renderNotificationSnapshot(
      command({ organizationName: 'Suar Product Studio' })
    )

    assert.equal(snapshot.message, 'Có yêu cầu tham gia tổ chức "Suar Product Studio".')
  })

  test('distinguishes mandatory review work from an optional suggestion', ({ assert }) => {
    const required = renderNotificationSnapshot({
      ...command({ reviewKind: 'task_review', reviewAudience: 'required' }),
      type: 'review_requested',
    })
    const suggested = renderNotificationSnapshot({
      ...command({ reviewKind: 'task_review', reviewAudience: 'suggested' }),
      type: 'review_requested',
    })

    assert.equal(required.title, 'Bạn cần review task')
    assert.equal(suggested.title, 'Gợi ý review task')
    assert.include(suggested.message, 'không phải yêu cầu bắt buộc')
  })

  test('renders a distinct action notification when a reviewee replies', ({ assert }) => {
    const snapshot = renderNotificationSnapshot({
      ...command({ reviewEvent: 'reviewee_response' }),
      type: 'review_received',
    })

    assert.equal(snapshot.title, 'Người thực hiện đã phản hồi review')
  })
})
