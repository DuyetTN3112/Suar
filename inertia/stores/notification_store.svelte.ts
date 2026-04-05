import {
  FRONTEND_DIALOG_NOTIFICATION_TYPES,
  type FrontendDialogNotificationType,
} from '@/constants/notifications'

/**
 * Global notification popup store.
 * Replaces toast notifications with persistent dialog popups.
 *
 * Usage:
 *   import { notificationStore } from '@/stores/notification_store.svelte'
 *   notificationStore.success('Thành công!')
 *   notificationStore.error('Có lỗi xảy ra')
 *   notificationStore.info('Thông tin')
 */

export type NotificationType = FrontendDialogNotificationType

export interface NotificationItem {
  id: number
  type: NotificationType
  title: string
  message?: string
}

let notifications = $state<NotificationItem[]>([])
let nextId = 0

function addNotification(type: NotificationType, title: string, message?: string) {
  notifications = [...notifications, { id: nextId++, type, title, message }]
}

function dismiss(id: number) {
  notifications = notifications.filter((n) => n.id !== id)
}

function dismissAll() {
  notifications = []
}

export const notificationStore = {
  get items() {
    return notifications
  },
  get current() {
    return notifications[0] ?? null
  },
  success(title: string, message?: string) {
    addNotification(FRONTEND_DIALOG_NOTIFICATION_TYPES.SUCCESS, title, message)
  },
  error(title: string, message?: string) {
    addNotification(FRONTEND_DIALOG_NOTIFICATION_TYPES.ERROR, title, message)
  },
  info(title: string, message?: string) {
    addNotification(FRONTEND_DIALOG_NOTIFICATION_TYPES.INFO, title, message)
  },
  dismiss,
  dismissAll,
}
