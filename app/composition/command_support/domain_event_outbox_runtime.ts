import { DomainEventDeliveryError } from '#modules/events/public_contracts/domain_event_delivery_error'

type ShutdownSignalName = 'SIGINT' | 'SIGTERM'

export interface DomainEventOutboxShutdownSignalSource {
  once(signal: ShutdownSignalName, listener: () => void): unknown
  removeListener(signal: ShutdownSignalName, listener: () => void): unknown
}

export function bindDomainEventOutboxShutdownSignals(
  abortController: AbortController,
  source: DomainEventOutboxShutdownSignalSource = process
): () => void {
  const stop = (): void => {
    if (!abortController.signal.aborted) {
      abortController.abort(
        new DomainEventDeliveryError('DOMAIN_EVENT_WORKER_SHUTDOWN', true)
      )
    }
  }
  source.once('SIGINT', stop)
  source.once('SIGTERM', stop)
  return () => {
    source.removeListener('SIGINT', stop)
    source.removeListener('SIGTERM', stop)
  }
}

export function waitForDomainEventOutboxPoll(
  milliseconds: number,
  signal: AbortSignal
): Promise<void> {
  if (signal.aborted) {
    return Promise.resolve()
  }
  return new Promise((resolve) => {
    const complete = (): void => {
      clearTimeout(timer)
      signal.removeEventListener('abort', complete)
      resolve()
    }
    const timer = setTimeout(complete, milliseconds)
    timer.unref()
    signal.addEventListener('abort', complete, { once: true })
  })
}
