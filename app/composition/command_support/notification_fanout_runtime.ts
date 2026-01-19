type NotificationFanoutShutdownSignalName = 'SIGINT' | 'SIGTERM'

export interface NotificationFanoutShutdownSignalSource {
  once(signal: NotificationFanoutShutdownSignalName, listener: () => void): unknown
  removeListener(signal: NotificationFanoutShutdownSignalName, listener: () => void): unknown
}

export function bindNotificationFanoutShutdownSignals(
  abortController: AbortController,
  source: NotificationFanoutShutdownSignalSource = process
): () => void {
  const stop = (): void => {
    if (!abortController.signal.aborted) {
      abortController.abort(new Error('NOTIFICATION_FANOUT_WORKER_SHUTDOWN'))
    }
  }
  source.once('SIGINT', stop)
  source.once('SIGTERM', stop)
  return () => {
    source.removeListener('SIGINT', stop)
    source.removeListener('SIGTERM', stop)
  }
}

export function waitForNotificationFanoutPoll(
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
