import { test } from '@japa/runner'

import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import type { NotificationActionContext } from '#modules/notifications/actions/notification_action_context'
import { NotificationActionFactory } from '#modules/notifications/actions/ports/inbound/notification_action_factory'
import { GetUserNotificationsQuery } from '#modules/notifications/actions/queries/get_user_notifications_query'
import LatestNotificationsController from '#modules/notifications/controllers/latest_notifications_controller'
import ListNotificationsController from '#modules/notifications/controllers/list_notifications_controller'

const expectedFailure = new Error('canonical_notification_feed_unavailable')

function fakeContext() {
  return {
    request: {
      input() {
        return undefined
      },
      header() {
        return null
      },
      ip() {
        return '127.0.0.1'
      },
    },
    auth: {
      user: {
        id: '11111111-1111-4111-8111-111111111111',
        current_organization_id: null,
      },
    },
    session: {
      get() {
        return null
      },
    },
    inertia: {
      render() {
        throw new Error('controller_must_not_render_false_empty_success')
      },
    },
    currentOrganizationId: null,
    currentOrganizationRole: null,
  }
}

function failingFactory(): NotificationActionFactory {
  return new (class extends NotificationActionFactory {
    makeDeleteNotification(): never {
      throw new Error('unexpected_delete_notification_use_case')
    }

    makeDeleteAllReadNotifications(): never {
      throw new Error('unexpected_delete_all_read_notifications_use_case')
    }

    makeMarkNotificationAsRead(): never {
      throw new Error('unexpected_mark_notification_as_read_use_case')
    }

    makeMarkAllNotificationsAsRead(): never {
      throw new Error('unexpected_mark_all_notifications_as_read_use_case')
    }

    makeGetUserNotifications(context: NotificationActionContext): GetUserNotificationsQuery {
      return new GetUserNotificationsQuery(context, {
        feedReader: {
          read: () => Promise.reject(expectedFailure),
        },
        unreadCountReader: {
          get: () => Promise.reject(new Error('unread count must not be read')),
        },
      })
    }
  })()
}

test.group('Unit | Notification controller failure semantics', () => {
  test('Inertia feed propagates canonical read failure instead of rendering an empty feed', async ({
    assert,
  }) => {
    const controller = new ListNotificationsController(failingFactory())

    await assert.rejects(
      () =>
        controller.handle(
          fakeContext() as unknown as Parameters<ListNotificationsController['handle']>[0]
        ),
      'canonical_notification_feed_unavailable'
    )
  })

  test('latest JSON feed preserves the read failure when its audit sink also fails', async ({
    assert,
    cleanup,
  }) => {
    const controller = new LatestNotificationsController(failingFactory())
    const originalWriteAllowAnonymous = auditPublicApi.writeAllowAnonymous.bind(auditPublicApi)
    auditPublicApi.writeAllowAnonymous = () =>
      Promise.reject(new Error('secondary_observability_sink_failure'))
    cleanup(() => {
      auditPublicApi.writeAllowAnonymous = originalWriteAllowAnonymous
    })

    await assert.rejects(
      () =>
        controller.handle(
          fakeContext() as unknown as Parameters<LatestNotificationsController['handle']>[0]
        ),
      'canonical_notification_feed_unavailable'
    )
  })
})
