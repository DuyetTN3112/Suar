/** Records successful delivery of a Search projection for a durable source revision. */
export interface SearchProjectionDeliveryReceiptWriter {
  acknowledge(sourceEventId: string): Promise<boolean>
}
