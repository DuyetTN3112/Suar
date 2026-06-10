import type { HttpContext } from '@adonisjs/core/http'

import {
  NOTIFICATION_FEED_PROMETHEUS_CONTENT_TYPE,
  notificationFeedRuntimeMetrics,
  renderNotificationFeedPrometheusMetrics,
} from '#modules/notifications/observability/notification_feed_runtime_metrics'

export default class NotificationMetricsController {
  handle({ response }: HttpContext) {
    response.header('content-type', NOTIFICATION_FEED_PROMETHEUS_CONTENT_TYPE)
    return response.send(
      renderNotificationFeedPrometheusMetrics(notificationFeedRuntimeMetrics.snapshot())
    )
  }
}
