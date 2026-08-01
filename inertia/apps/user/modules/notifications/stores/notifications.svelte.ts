import {
  createNotificationCenterStore,
  type NotificationCenterItem,
} from '@/apps/shared/notifications/notification_center_store.svelte'
import { translationStore } from '@/apps/user/shared/stores/translation.svelte'

export type Notification = NotificationCenterItem

const notificationCenter = createNotificationCenterStore({
  loadErrorMessage: () =>
    translationStore.t('notifications.load_error', {}, 'Unable to load notifications'),
  mutationErrorMessage: () =>
    translationStore.t(
      'notifications.mutation_error',
      {},
      'Unable to update notifications. Please try again.'
    ),
})

export function useNotifications() {
  notificationCenter.activate()
  return notificationCenter
}
