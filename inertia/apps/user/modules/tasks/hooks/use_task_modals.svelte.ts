import axios from 'axios'

import type { TaskDetail } from '@/apps/user/modules/tasks/types/index.svelte'
import { notificationStore } from '@/apps/user/shared/stores/notification_store.svelte'
import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'


interface CreateTaskPermissionResponse {
  data: {
    canCreate: boolean
    reason?: string | null
  }
}

export function createTaskModalsStore() {
  const { t } = useTranslation()
  let createModalOpen = $state(false)
  let detailModalOpen = $state<boolean>(false)
  let selectedTaskId = $state<string | null>(null)
  let selectedTask = $state<TaskDetail | null>(null)
  let isCheckingPermission = $state(false)

  // Open create-task modal after permission check.
  async function handleCreateClick() {
    try {
      isCheckingPermission = true

      const response = await axios.get<CreateTaskPermissionResponse>(
        '/api/v1/tasks/creation-access'
      )

      if (response.data.data.canCreate) {
        createModalOpen = true
      } else {
        notificationStore.error(
          t('task.create.permission_denied_title', {}, 'You do not have permission to create tasks'),
          response.data.data.reason ??
            t(
              'task.create.permission_denied_description',
              {},
              'Only organization owners, organization admins, or project managers for the selected project can create tasks.'
            )
        )
      }
    } catch (error) {
      console.error('Error checking permission:', error)
      notificationStore.error(
        t('task.create.permission_check_failed_title', {}, 'Unable to check task creation permission'),
        t('common.please_try_again', {}, 'Please try again.')
      )
    } finally {
      isCheckingPermission = false
    }
  }

  // Open task detail modal.
  function handleDetailClick(task: TaskDetail) {
    try {
      selectedTask = task
      selectedTaskId = task.id
      detailModalOpen = true
    } catch (error) {
      console.error('Error opening task detail modal:', error)
    }
  }

  // Reset modal state after close animation.
  function handleDetailClose(open: boolean) {
    detailModalOpen = open
    if (!open) {
      setTimeout(() => {
        selectedTask = null
        selectedTaskId = null
      }, 300)
    }
  }

  return {
    createModalOpen: {
      get value() {
        return createModalOpen
      },
      set value(val: boolean) {
        createModalOpen = val
      },
    },
    detailModalOpen: {
      get value() {
        return detailModalOpen
      },
      set value(val: boolean) {
        detailModalOpen = val
      },
    },
    selectedTaskId: {
      get value() {
        return selectedTaskId
      },
      set value(val: string | null) {
        selectedTaskId = val
      },
    },
    selectedTask: {
      get value() {
        return selectedTask
      },
      set value(val: TaskDetail | null) {
        selectedTask = val
      },
    },
    get isCheckingPermission() {
      return isCheckingPermission
    },
    handleCreateClick,
    handleDetailClick,
    handleDetailClose,
  }
}
