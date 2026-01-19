/**
 * Delivery failure protocol shared by the Events worker and event consumers.
 *
 * Consumers throw this error to tell the durable worker whether retrying the
 * same payload can succeed. It intentionally carries no Events implementation
 * details.
 */
export class DomainEventDeliveryError extends Error {
  constructor(
    public readonly errorCode: string,
    public readonly retryable: boolean,
    options?: ErrorOptions
  ) {
    super(errorCode, options)
    this.name = 'DomainEventDeliveryError'
  }
}
