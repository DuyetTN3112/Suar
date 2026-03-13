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

export type NotificationType = 'success' | 'error' | 'info'

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
    addNotification('success', title, message)
  },
  error(title: string, message?: string) {
    addNotification('error', title, message)
  },
  info(title: string, message?: string) {
    addNotification('info', title, message)
  },
  dismiss,
  dismissAll,
}
