import type {
  NotificationOutboxHandler,
  NotificationOutboxHandlerContext,
  NotificationOutboxJob,
} from '#modules/notifications/domain/notification_outbox'
import {
  NotificationPermanentDeliveryError,
  NotificationTransientDeliveryError,
} from '#modules/notifications/domain/notification_outbox_errors'
import {
  NotificationUnreadCacheProjection,
  type NotificationUnreadProjectionValue,
} from '#modules/notifications/infra/cache/notification_unread_cache_projection'

export interface NotificationUnreadProjector {
  apply(value: NotificationUnreadProjectionValue): Promise<boolean>
}

export interface NotificationUnreadCanonicalStateReader {
  read(recipientId: string): Promise<{ count: number; revision: number }>
}

interface UnreadPayload {
  recipientId: string
  count: number
  revision: number
}

function parseUnreadPayload(job: NotificationOutboxJob): UnreadPayload {
  if (job.destination !== 'unread_cache' || job.eventKind !== 'unread_absolute') {
    throw new NotificationPermanentDeliveryError('invalid_unread_projection_job')
  }

  const recipientId = job.payload['recipientId']
  const count = job.payload['count']
  const revision = job.payload['revision']
  if (
    typeof recipientId !== 'string' ||
    recipientId !== job.recipientId ||
    typeof count !== 'number' ||
    typeof revision !== 'number' ||
    revision !== job.recipientStateRevision
  ) {
    throw new NotificationPermanentDeliveryError('invalid_unread_projection_payload')
  }

  return { recipientId, count, revision }
}

export class NotificationUnreadProjectionHandler {
  readonly deliver: NotificationOutboxHandler
  private readonly projector: NotificationUnreadProjector
  private readonly canonical: NotificationUnreadCanonicalStateReader | undefined

  constructor(
    projector: NotificationUnreadProjector = new NotificationUnreadCacheProjection(),
    canonical?: NotificationUnreadCanonicalStateReader
  ) {
    this.projector = projector
    this.canonical = canonical
    this.deliver = (job, context) => this.handle(job, context)
  }

  private async handle(
    job: NotificationOutboxJob,
    context: NotificationOutboxHandlerContext
  ): Promise<void> {
    if (context.signal.aborted) {
      throw new NotificationTransientDeliveryError('unread_projection_delivery_aborted')
    }
    const payload = parseUnreadPayload(job)
    let value = payload
    if (this.canonical) {
      try {
        value = {
          recipientId: payload.recipientId,
          ...(await this.canonical.read(payload.recipientId)),
        }
      } catch {
        throw new NotificationTransientDeliveryError('unread_canonical_state_unavailable')
      }
    }
    await this.projector.apply(value)
  }
}
