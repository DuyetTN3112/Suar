export abstract class NotificationDeliveryError extends Error {
  abstract readonly retryable: boolean
}

export class NotificationTransientDeliveryError extends NotificationDeliveryError {
  readonly retryable = true
}

export class NotificationPermanentDeliveryError extends NotificationDeliveryError {
  readonly retryable = false
}

