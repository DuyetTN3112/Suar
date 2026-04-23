import { ComposedNotificationActionFactory } from '#composition/factories/notification_action_factory'
import notificationConfig from '#config/notification'
import type { NotificationActionContext } from '#modules/notifications/actions/notification_action_context'
import { CachedNotificationUnreadCountReader } from '#modules/notifications/infra/adapters/notification-feed/cached_notification_unread_count_reader'
import { RedisNotificationFeedFallbackAdmissionController } from '#modules/notifications/infra/adapters/notification-feed/notification_feed_fallback_admission'
import { NotificationUnreadCacheProjection } from '#modules/notifications/infra/adapters/notification-feed/notification_unread_cache_projection'
import { RedisNotificationUnreadCacheReader } from '#modules/notifications/infra/adapters/notification-feed/notification_unread_cache_reader'
import { PostgresNotificationCanonicalFeedReader } from '#modules/notifications/infra/repositories/notification-feed/postgres_notification_canonical_feed_reader'
import { DEFAULT_NOTIFICATION_READ_ALIAS } from '#modules/notifications/infra/repositories/notification-outbox/postgres_notification_projection_delivery_repository'
import PostgresNotificationRepository from '#modules/notifications/infra/repositories/notification-outbox/postgres_notification_repository'
import { PostgresNotificationUnreadStateReader } from '#modules/notifications/infra/repositories/notification-outbox/postgres_notification_unread_state_reader'
import { ResilientNotificationFeedReader } from '#modules/notifications/infra/adapters/notification-feed/resilient_notification_feed_reader'
import { NotificationSearchFeedRepository } from '#modules/notifications/infra/repositories/notification-feed/notification_search_feed_repository'
import { NotificationFeedCursorCodec } from '#modules/notifications/infra/adapters/notification-feed/notification_feed_cursor_codec'
import { notificationFeedRuntimeMetrics } from '#modules/notifications/observability/notification-feed/notification_feed_runtime_metrics'
import { NotificationFeedShadowObserver } from '#modules/notifications/observability/notification-feed/notification_feed_shadow_observer'

const cursorCodec = new NotificationFeedCursorCodec({
  secret: notificationConfig.feedCursorSecret,
  keyId: notificationConfig.feedCursorKeyId,
  verificationSecrets: notificationConfig.feedCursorVerificationSecrets,
  ttlMs: notificationConfig.feedCursorTtlMs,
})
const shadowObserver = new NotificationFeedShadowObserver()

const notificationFeedReader = new ResilientNotificationFeedReader({
  mode: notificationConfig.feedReadMode,
  fallbackEnabled: notificationConfig.feedFallbackEnabled,
  fallbackMaxConcurrent: notificationConfig.feedFallbackMaxConcurrent,
  fallbackAdmission: new RedisNotificationFeedFallbackAdmissionController({
    maxConcurrent: notificationConfig.feedFallbackGlobalMaxConcurrent,
    leaseMs: notificationConfig.feedFallbackAdmissionLeaseMs,
  }),
  canonical: new PostgresNotificationCanonicalFeedReader(cursorCodec),
  search: new NotificationSearchFeedRepository({
    cursorCodec,
    readAlias: DEFAULT_NOTIFICATION_READ_ALIAS,
  }),
  circuitFailureThreshold: notificationConfig.feedCircuitFailureThreshold,
  circuitOpenMs: notificationConfig.feedCircuitOpenMs,
  shadowLagAllowanceMs: notificationConfig.feedShadowLagAllowanceMs,
  shadowSampleRate: notificationConfig.feedShadowSampleRate,
  onShadowComparison: (comparison) => shadowObserver.observe(comparison),
  telemetry: notificationFeedRuntimeMetrics,
})

const notificationUnreadCountReader = new CachedNotificationUnreadCountReader({
  cache: new RedisNotificationUnreadCacheReader(),
  canonical: new PostgresNotificationUnreadStateReader(),
  cacheWriter: new NotificationUnreadCacheProjection(),
})

export const notificationActionFactory = new ComposedNotificationActionFactory(
  new PostgresNotificationRepository(),
  {
    feedReader: notificationFeedReader,
    unreadCountReader: notificationUnreadCountReader,
  }
)

export function makeGetUserNotifications(execCtx: NotificationActionContext) {
  const query = notificationActionFactory.makeGetUserNotifications(execCtx)
  return {
    handle: query.execute.bind(query),
  }
}
