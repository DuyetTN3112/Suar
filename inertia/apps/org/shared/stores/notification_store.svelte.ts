import type { FrontendDialogNotificationType } from '@/apps/org/modules/notifications/constants/notifications'
import { uiToast } from '@/apps/org/shared/lib/ui_toast'

/**
 * Global notification popup store.
 * Replaces toast notifications with persistent dialog popups.
 *
 * Usage:
 *   import { notificationStore } from '@/apps/org/shared/stores/notification_store.svelte'
 *   notificationStore.success('Success!')
 *   notificationStore.error('Something went wrong')
 *   notificationStore.info('Information')
 */

export type NotificationType = FrontendDialogNotificationType

export interface NotificationItem {
  id: number
  type: NotificationType
  title: string
  message?: string
}

const notifications: NotificationItem[] = []

function dismiss(_id: number) {}

function dismissAll() {}

export const notificationStore = {
  get items() {
    return notifications
  },
  get current() {
    return null
  },
  success(title: string, message?: string) {
    uiToast.success(title, message)
  },
  error(title: string, message?: string) {
    uiToast.error(title, message)
  },
  info(title: string, message?: string) {
    uiToast.info(title, message)
  },
  dismiss,
  dismissAll,
}
