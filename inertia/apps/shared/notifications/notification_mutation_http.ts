export class NotificationMutationHttpError extends Error {
  constructor(readonly status: number) {
    super(`Notification mutation failed with HTTP ${status}`)
    this.name = 'NotificationMutationHttpError'
  }
}

export async function executeNotificationMutation(
  input: RequestInfo | URL,
  init: RequestInit
): Promise<void> {
  const response = await fetch(input, init)
  if (!response.ok) {
    throw new NotificationMutationHttpError(response.status)
  }
}
