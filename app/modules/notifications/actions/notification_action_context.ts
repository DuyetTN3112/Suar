export interface NotificationActionContext {
  readonly userId: string | null
  readonly ip: string
  readonly userAgent: string
  readonly organizationId: string | null
}

export interface AuthenticatedNotificationActionContext extends NotificationActionContext {
  readonly userId: string
}

export function makeSystemNotificationActionContext(
  systemUserId: string
): AuthenticatedNotificationActionContext {
  return {
    userId: systemUserId,
    ip: '0.0.0.0',
    userAgent: 'system',
    organizationId: null,
  }
}
