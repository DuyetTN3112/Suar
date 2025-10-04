import type { HttpContext } from '@adonisjs/core/http'

import { mapApiV1NotificationResponse, wrapApiV1Data } from '#modules/http/api_v1/response_mappers'
import { optionalActionContextFromHttp } from '#modules/http/public_contracts/http_execution_context'
import GetUserNotifications from '#modules/notifications/actions/get_user_notifications'
import { serializeNotifications } from '#modules/notifications/actions/serializers/notification_serializer'
import { NOTIFICATION_PAGINATION as PAGINATION } from '#modules/notifications/application/dtos/common/notification_pagination'
import { buildNotificationEvent } from '#modules/notifications/observability/notification_event_factory'
import {
  PLATFORM_EVENT_NAMES,
  platformOperationalLogger,
  platformWorkflowLogger,
} from '#modules/observability/public_contracts/platform_observability'
import { normalizePagination } from '#modules/pagination/public_contracts/pagination_public_api'
const LATEST_NOTIFICATIONS_DEFAULT_LIMIT = 10

/**
 * GET /notifications/latest → Get latest notifications (JSON API)
 */
export default class LatestNotificationsController {
  async handle(ctx: HttpContext) {
    const { request } = ctx
    const execCtx = optionalActionContextFromHttp(ctx)
    const pagination = normalizePagination(
      {
        limit: request.input('limit'),
      },
      PAGINATION,
      {
        perPage: LATEST_NOTIFICATIONS_DEFAULT_LIMIT,
      }
    )

    try {
      const getUserNotifications = new GetUserNotifications(execCtx)
      const result = await getUserNotifications.handle({
        page: pagination.page,
        limit: pagination.perPage,
        unread_only: false,
      })
      const notificationsData = serializeNotifications(result.notifications).map(
        mapApiV1NotificationResponse
      )

      platformOperationalLogger.log(
        'info',
        buildNotificationEvent(execCtx, {
          eventName: PLATFORM_EVENT_NAMES.NOTIFICATION_FEED_LOADED,
          eventFamily: 'query',
          subsystem: 'notification_center',
          workflow: 'notification_feed_load',
          stage: 'completed',
          outcome: 'success',
          targetType: 'notification_feed',
          targetId: execCtx.userId,
          change: {
            limit: pagination.perPage,
            unread_count: result.unread_count,
            result_count: notificationsData.length,
          },
          runtime: {
            limit: pagination.perPage,
          },
          retentionClass: 'transient_runtime',
        })
      )

      return {
        ...wrapApiV1Data(notificationsData),
        unreadCount: result.unread_count,
      }
    } catch (error) {
      await platformWorkflowLogger.checkpoint(
        execCtx,
        buildNotificationEvent(execCtx, {
          eventName: PLATFORM_EVENT_NAMES.NOTIFICATION_FEED_FAILED,
          eventFamily: 'query',
          subsystem: 'notification_center',
          workflow: 'notification_feed_load',
          stage: 'failed',
          outcome: 'failure',
          targetType: 'notification_feed',
          targetId: execCtx.userId,
          change: {
            limit: pagination.perPage,
          },
          runtime: {
            limit: pagination.perPage,
          },
          error,
        })
      )

      return {
        ...wrapApiV1Data([]),
        unreadCount: 0,
      }
    }
  }
}
