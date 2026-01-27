import {
  resolveNotificationDeepLink,
  type NotificationDeepLinkAction,
  type NotificationDeepLinkInput,
  type NotificationShell,
} from '@/apps/shared/notifications/notification_deep_links'

export type NotificationPageShell = 'app' | 'organization' | 'admin'

export interface NotificationPageItem {
  type: string
  related_entity_type: string | null
  related_entity_id: string | null
  data?: Record<string, unknown>
  action?: NotificationDeepLinkAction | null
}

function toNotificationShell(shell: NotificationPageShell): NotificationShell {
  switch (shell) {
    case 'organization':
      return 'org'
    case 'admin':
      return 'admin'
    case 'app':
    default:
      return 'user'
  }
}

export function notificationPageInboxUrl(shell: NotificationPageShell): string {
  switch (shell) {
    case 'organization':
      return '/org/notifications'
    case 'admin':
      return '/admin/notifications'
    case 'app':
    default:
      return '/notifications'
  }
}

export function resolveNotificationPageDeepLink(
  notification: NotificationPageItem,
  shell: NotificationPageShell
): ReturnType<typeof resolveNotificationDeepLink> {
  const deepLinkInput: NotificationDeepLinkInput = {
    type: notification.type,
    relatedEntityType: notification.related_entity_type,
    relatedEntityId: notification.related_entity_id,
    metadata: notification.data ?? null,
    action: notification.action ?? null,
  }

  return resolveNotificationDeepLink(deepLinkInput, toNotificationShell(shell))
}
