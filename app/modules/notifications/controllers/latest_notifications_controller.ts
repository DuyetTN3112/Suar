import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

import {
  mapApiV1NotificationResponse,
  mapApiV1Pagination,
  wrapApiV1Data,
} from '#modules/http/boundary/api_v1_response'
import { optionalActionContextFromHttp } from '#modules/http/boundary/http_execution_context'
import { NOTIFICATION_PAGINATION as PAGINATION } from '#modules/notifications/actions/dtos/common/notification_pagination'
import { NotificationActionFactory } from '#modules/notifications/actions/ports/inbound/notification_action_factory'
import { mapNotificationResponses } from '#modules/notifications/controllers/mappers/response/notification_response_mapper'
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
@inject()
export default class LatestNotificationsController {
  constructor(private readonly actions: NotificationActionFactory) {}

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
      const getUserNotifications = this.actions.makeGetUserNotifications(execCtx)
      const result = await getUserNotifications.execute({
        page: pagination.page,
        limit: pagination.perPage,
        unread_only: false,
      })
      const notificationsData = mapNotificationResponses(result.notifications).map(
        mapApiV1NotificationResponse
      )

      platformOperationalLogger.log(
        'debug',
        buildNotificationEvent(execCtx, {
          eventName: PLATFORM_EVENT_NAMES.NOTIFICATION_FEED_LOADED,
          eventFamily: 'query',
          subsystem: 'notification_center',
          workflow: 'notification_feed_load',
          stage: 'completed',
          outcome: 'success',
          severity: 'debug',
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
        recipientId: result.recipient_id,
        unreadCount: result.unread_count,
        recipientStateRevision: result.recipient_state_revision,
        pagination: mapApiV1Pagination({
          ...result.meta,
          cursor: result.cursor,
        }),
      }
    } catch (error) {
      await platformWorkflowLogger.checkpointSafely(
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

      throw error
    }
  }
}
