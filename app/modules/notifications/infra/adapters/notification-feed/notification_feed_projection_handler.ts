import db from '@adonisjs/lucid/services/db'

import type {
  NotificationOutboxHandler,
  NotificationOutboxHandlerContext,
  NotificationOutboxJob,
} from '#modules/notifications/domain/notification-outbox/notification_outbox'
import {
  NotificationPermanentDeliveryError,
  NotificationTransientDeliveryError,
} from '#modules/notifications/domain/notification-outbox/notification_outbox_errors'
import {
  toActiveNotificationSearchDocument,
  toNotificationTombstoneSearchDocument,
  type CanonicalNotificationProjectionRow,
  type NotificationTombstoneProjectionRow,
} from '#modules/notifications/domain/notification-feed/notification_projection_document'
import {
  DEFAULT_NOTIFICATION_READ_ALIAS,
  DEFAULT_NOTIFICATION_WRITE_ALIAS,
  PostgresNotificationProjectionDeliveryRepository,
} from '#modules/notifications/infra/repositories/notification-outbox/postgres_notification_projection_delivery_repository'
import {
  NotificationSearchIndexRepository,
  type NotificationProjectionBatchResult,
  type NotificationSearchDocument,
} from '#modules/notifications/infra/repositories/notification-observability/notification_search_index_repository'

export interface NotificationSearchProjector {
  ensureIndex(input: {
    physicalIndex: string
    readAlias: string
    writeAlias: string
  }): Promise<void>
  projectMany(
    physicalIndex: string,
    documents: NotificationSearchDocument[]
  ): Promise<NotificationProjectionBatchResult>
}

interface NotificationFeedProjectionHandlerOptions {
  projector?: NotificationSearchProjector
  deliveries?: PostgresNotificationProjectionDeliveryRepository
  now?: () => Date
}

export class NotificationFeedProjectionHandler {
  readonly deliver: NotificationOutboxHandler
  private readonly projector: NotificationSearchProjector
  private readonly deliveries: PostgresNotificationProjectionDeliveryRepository
  private readonly now: () => Date

  constructor(options: NotificationFeedProjectionHandlerOptions = {}) {
    this.projector = options.projector ?? new NotificationSearchIndexRepository()
    this.deliveries = options.deliveries ?? new PostgresNotificationProjectionDeliveryRepository()
    this.now = options.now ?? (() => new Date())
    this.deliver = (job, context) => this.handle(job, context)
  }

  private async handle(
    job: NotificationOutboxJob,
    context: NotificationOutboxHandlerContext
  ): Promise<void> {
    if (job.destination !== 'feed_search' || !job.notificationId) {
      throw new NotificationPermanentDeliveryError('invalid_feed_projection_job')
    }

    const document = await this.loadLatestDocument(job.notificationId)
    const required = await this.deliveries.prepareRequiredDeliveries(job, this.now())

    for (const { target, delivery } of required) {
      if (context.signal.aborted) {
        throw new NotificationTransientDeliveryError('feed_projection_aborted')
      }
      if (delivery.status === 'processed') {
        continue
      }
      if (delivery.status === 'dead_letter') {
        throw new NotificationPermanentDeliveryError(
          delivery.lastErrorClass ?? 'projection_target_dead_letter'
        )
      }

      if (target.status === 'primary') {
        await this.projector.ensureIndex({
          physicalIndex: target.physicalIndex,
          readAlias: DEFAULT_NOTIFICATION_READ_ALIAS,
          writeAlias: DEFAULT_NOTIFICATION_WRITE_ALIAS,
        })
      }

      const leased = await this.deliveries.leaseDelivery({
        outboxId: job.id,
        targetId: target.id,
        parentLeaseToken: job.leaseToken,
        parentLockedUntil: job.lockedUntil,
        now: this.now(),
      })
      if (!leased) {
        throw new NotificationTransientDeliveryError('projection_delivery_lease_unavailable')
      }

      const result = await this.projector.projectMany(target.physicalIndex, [document])
      const failure = result.failures[0]
      if (failure) {
        await this.deliveries.failDelivery({
          outboxId: job.id,
          targetId: target.id,
          parentLeaseToken: job.leaseToken,
          permanent: !failure.retryable,
          errorClass: failure.errorClass,
          errorMessage: failure.errorMessage,
          now: this.now(),
        })
        if (failure.retryable) {
          throw new NotificationTransientDeliveryError(failure.errorClass)
        }
        throw new NotificationPermanentDeliveryError(failure.errorClass)
      }

      const acknowledged = await this.deliveries.acknowledgeDelivery({
        outboxId: job.id,
        targetId: target.id,
        parentLeaseToken: job.leaseToken,
        appliedRevision: document.revision,
        now: this.now(),
      })
      if (!acknowledged) {
        throw new NotificationTransientDeliveryError('projection_delivery_lease_lost')
      }
    }
  }

  private async loadLatestDocument(notificationId: string): Promise<NotificationSearchDocument> {
    const row = (await db
      .from('notifications')
      .select(
        'id',
        'event_id',
        'user_id',
        'scope_type',
        'scope_id',
        'organization_id',
        'type',
        'schema_version',
        'category',
        'priority',
        'is_read',
        'title',
        'message',
        'related_entity_type',
        'related_entity_id',
        'action',
        'occurred_at',
        'created_at',
        'updated_at',
        'read_at',
        'revision'
      )
      .where('id', notificationId)
      .first()) as CanonicalNotificationProjectionRow | undefined
    if (row) {
      return toActiveNotificationSearchDocument(row)
    }

    const tombstone = (await db
      .from('notification_tombstones')
      .select('notification_id', 'recipient_id', 'final_revision', 'deleted_at')
      .where('notification_id', notificationId)
      .first()) as NotificationTombstoneProjectionRow | undefined
    if (tombstone) {
      return toNotificationTombstoneSearchDocument(tombstone)
    }

    throw new NotificationPermanentDeliveryError('canonical_projection_source_missing')
  }
}
