import { createHash } from 'node:crypto'

import loggerService, { type LogLevel } from '#modules/logger/public_contracts/application_logger'
import type { NotificationFeedShadowComparison } from '#modules/notifications/actions/dtos/notification_feed_shadow_comparison'

type ShadowLog = (level: LogLevel, eventName: string, payload: Record<string, unknown>) => void

export class NotificationFeedShadowObserver {
  constructor(
    private readonly log: ShadowLog = (level, eventName, payload) => {
      loggerService.logStructured(level, eventName, payload)
    }
  ) {}

  observe(comparison: NotificationFeedShadowComparison): void {
    const level: LogLevel =
      comparison.classification === 'unexplained_mismatch' ||
      comparison.classification === 'search_error'
        ? 'warn'
        : 'info'
    this.log(level, `notifications.feed.shadow.${comparison.classification}`, {
      component: 'notification_feed_shadow',
      classification: comparison.classification,
      recipient_hash: createHash('sha256')
        .update(comparison.recipientId, 'utf8')
        .digest('hex')
        .slice(0, 16),
      matches: comparison.matches,
      canonical_count: comparison.canonicalIds.length,
      search_count: comparison.searchIds.length,
      missing_count: comparison.missingIds.length,
      extra_count: comparison.extraIds.length,
      stale_count: comparison.staleIds.length,
      state_mismatch_count: comparison.stateMismatchIds.length,
      search_ahead_count: comparison.searchAheadIds.length,
      has_next_page_matches: comparison.hasNextPageMatches,
      samples: {
        missing: comparison.missingIds.slice(0, 10),
        extra: comparison.extraIds.slice(0, 10),
        stale: comparison.staleIds.slice(0, 10),
        state_mismatch: comparison.stateMismatchIds.slice(0, 10),
        search_ahead: comparison.searchAheadIds.slice(0, 10),
      },
      ...(comparison.errorClass ? { error_class: comparison.errorClass } : {}),
    })
  }
}
