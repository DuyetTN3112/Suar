import { serializeObservabilityError } from '#modules/errors/public_contracts/observability_error'
import type {
  NotificationUnreadCountOptions,
  NotificationUnreadCountReader,
  NotificationUnreadCountResult,
} from '#modules/notifications/actions/ports/outbound/notification_unread_count_reader'
import type {
  NotificationUnreadCacheReader,
  NotificationUnreadStateReader,
  NotificationUnreadStateWriter,
} from '#modules/notifications/actions/ports/outbound/notification_unread_state'
import {
  buildPlatformTraceContext,
  createCorrelationKey,
  platformOperationalLogger,
  type PlatformEvent,
  type PlatformOperationalLogger,
} from '#modules/observability/public_contracts/platform_observability'

interface CachedNotificationUnreadCountReaderOptions {
  cache: NotificationUnreadCacheReader
  canonical: NotificationUnreadStateReader
  cacheWriter: NotificationUnreadStateWriter
  operationalLogger?: Pick<PlatformOperationalLogger, 'log'>
}

const utf8Encoder = new TextEncoder()

function parseCachedValue(raw: string | null): { count: number; revision: number } | null {
  if (!raw || utf8Encoder.encode(raw).byteLength > 512) {
    return null
  }
  try {
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return null
    }
    const record = value as Record<string, unknown>
    if (
      !Number.isSafeInteger(record['count']) ||
      Number(record['count']) < 0 ||
      !Number.isSafeInteger(record['revision']) ||
      Number(record['revision']) < 0
    ) {
      return null
    }
    return {
      count: Number(record['count']),
      revision: Number(record['revision']),
    }
  } catch {
    return null
  }
}

type NotificationUnreadCacheDegradationStage =
  | 'cache_read_failed'
  | 'cache_value_invalid'
  | 'cache_rebuild_failed'

function buildUnreadCacheDegradationEvent(
  recipientId: string,
  stage: NotificationUnreadCacheDegradationStage,
  error?: unknown
): PlatformEvent {
  const serializedError = serializeObservabilityError(error)

  return {
    event_name: 'notification.unread_count.cache_degraded',
    event_family: 'notification',
    module: 'notifications',
    subsystem: 'notification_unread_cache',
    workflow: 'notification_unread_count_read',
    stage,
    severity: 'warn',
    outcome: 'warning',
    occurred_at: new Date().toISOString(),
    actor: {
      initiator_type: 'system',
      role_surface: 'notification_unread_count_service',
    },
    request: null,
    trace: buildPlatformTraceContext({
      workflow: 'notification_unread_count_read',
      correlationKey: createCorrelationKey([recipientId, stage]),
    }),
    target: {
      type: 'notification_unread_cache',
      id: null,
      scope: 'recipient',
    },
    change: {
      recovery:
        stage === 'cache_rebuild_failed'
          ? 'canonical_result_returned_without_cache_refresh'
          : 'postgres_canonical_read',
    },
    runtime: {
      dependency: 'redis',
    },
    error: serializedError
      ? {
          class: serializedError['class'] ?? 'UnknownError',
        }
      : null,
    compliance: {
      redaction_applied: error !== undefined,
      retention_class: 'transient_runtime',
      contains_sensitive_fields: false,
      contains_user_input: false,
    },
  }
}

export class CachedNotificationUnreadCountReader implements NotificationUnreadCountReader {
  private readonly cache: NotificationUnreadCacheReader
  private readonly canonical: NotificationUnreadStateReader
  private readonly cacheWriter: NotificationUnreadStateWriter
  private readonly operationalLogger: Pick<PlatformOperationalLogger, 'log'>

  constructor(options: CachedNotificationUnreadCountReaderOptions) {
    this.cache = options.cache
    this.canonical = options.canonical
    this.cacheWriter = options.cacheWriter
    this.operationalLogger = options.operationalLogger ?? platformOperationalLogger
  }

  async get(
    recipientId: string,
    options: NotificationUnreadCountOptions = {}
  ): Promise<NotificationUnreadCountResult> {
    if (options.consistency !== 'strong') {
      try {
        const raw = await this.cache.get(recipientId)
        const cached = parseCachedValue(raw)
        if (cached) {
          return { ...cached, source: 'redis' }
        }
        if (raw !== null) {
          this.recordCacheDegradationSafely(recipientId, 'cache_value_invalid')
        }
      } catch (error) {
        // The derived cache is optional; PostgreSQL remains canonical.
        this.recordCacheDegradationSafely(recipientId, 'cache_read_failed', error)
      }
    }

    const canonical = await this.canonical.read(recipientId)
    try {
      await this.cacheWriter.apply({
        recipientId,
        count: canonical.count,
        revision: canonical.revision,
      })
    } catch (error) {
      // A best-effort cache rebuild must not hide canonical state.
      this.recordCacheDegradationSafely(recipientId, 'cache_rebuild_failed', error)
    }
    return { ...canonical, source: 'postgres' }
  }

  private recordCacheDegradationSafely(
    recipientId: string,
    stage: NotificationUnreadCacheDegradationStage,
    error?: unknown
  ): void {
    try {
      this.operationalLogger.log(
        'warn',
        buildUnreadCacheDegradationEvent(recipientId, stage, error)
      )
    } catch {
      // Telemetry failure must not replace an available canonical result.
    }
  }
}
