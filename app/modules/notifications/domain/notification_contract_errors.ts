import AppException from '#modules/errors/public_contracts/application_exception'

export class NotificationFeedCursorError extends AppException {
  static override status = 422
  static override code = 'E_NOTIFICATION_CURSOR_RESTART_REQUIRED'

  constructor() {
    super('Notification feed cursor is invalid or expired; restart pagination', {
      shouldReport: false,
      details: { restartRequired: true },
    })
  }
}

export class NotificationFeedFallbackCapacityError extends AppException {
  static override status = 503
  static override code = 'E_NOTIFICATION_FEED_FALLBACK_CAPACITY'

  constructor() {
    super('Notification feed fallback capacity is temporarily exhausted', {
      retryable: true,
      shouldReport: false,
    })
  }
}

export class NotificationFeedFallbackAdmissionUnavailableError extends AppException {
  static override status = 503
  static override code = 'E_NOTIFICATION_FEED_FALLBACK_ADMISSION_UNAVAILABLE'

  constructor(cause?: unknown) {
    super('Notification feed fallback admission control is temporarily unavailable', {
      retryable: true,
      cause,
    })
  }
}

export class NotificationEventConflictError extends Error {
  readonly code = 'NOTIFICATION_EVENT_CONFLICT'

  constructor() {
    super('Notification event conflict: the stored fingerprint differs from this retry')
    this.name = 'NotificationEventConflictError'
  }
}

export class NotificationDedupeConflictError extends Error {
  readonly code = 'NOTIFICATION_DEDUPE_CONFLICT'

  constructor() {
    super('Notification dedupe conflict: the dedupe key belongs to another event')
    this.name = 'NotificationDedupeConflictError'
  }
}

export class NotificationCanonicalStateError extends Error {
  readonly code = 'NOTIFICATION_CANONICAL_STATE_ERROR'

  constructor(message: string) {
    super(message)
    this.name = 'NotificationCanonicalStateError'
  }
}
