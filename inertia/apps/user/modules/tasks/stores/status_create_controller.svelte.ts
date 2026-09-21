import { router } from '@inertiajs/svelte'

import { createTaskStatusDefinition } from '@/apps/user/modules/tasks/api/status_management_api'
import {
  getStatusMutationErrorMessage,
  slugifyStatusName,
} from '@/apps/user/modules/tasks/lib/helpers/status_management_helpers'
import type { TaskMetadata, TaskStatusCategory } from '@/apps/user/modules/tasks/types/index.svelte'
import { notificationStore } from '@/apps/user/shared/stores/notification_store.svelte'
import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

interface CreateStatusControllerOptions {
  getStatuses: () => TaskMetadata['statuses']
  requireProjectId: () => string | null
  canManageWorkflow: () => boolean
  hasStatusMutationLock: () => boolean
  isBoardReady: (actionErrorMessage: string) => boolean
}

export function createStatusCreateController({
  getStatuses,
  requireProjectId,
  canManageWorkflow,
  hasStatusMutationLock,
  isBoardReady,
}: CreateStatusControllerOptions) {
  const { t } = useTranslation()

  let createStatusModalOpen = $state(false)
  let createStatusName = $state('')
  let createStatusCategory = $state<TaskStatusCategory | ''>('')
  let createStatusDescription = $state('')
  let createStatusColor = $state('#6B7280')
  let createStatusSubmitting = $state(false)
  let createStatusError = $state('')

  function handleCreateStatusClick() {
    if (!canManageWorkflow()) {
      notificationStore.error(
        t('task.workflow.permission_title', {}, 'You do not have permission to manage workflow'),
        t(
          'task.workflow.create_permission_message',
          {},
          'Only users with workflow permission can add statuses.'
        )
      )
      return
    }

    if (
      !isBoardReady(
        t(
          'task.workflow.manage_wait_message',
          {},
          'Please wait for drag-and-drop changes to finish before managing statuses.'
        )
      )
    ) {
      return
    }
    if (!requireProjectId()) return
    createStatusModalOpen = true
    createStatusError = ''
  }

  async function handleCreateStatusSubmit() {
    if (!canManageWorkflow()) {
      createStatusError = t(
        'task.workflow.no_permission_error',
        {},
        'You do not have permission to manage workflow.'
      )
      return
    }

    if (hasStatusMutationLock()) {
      createStatusError = t(
        'task.workflow.board_sync_retry_error',
        {},
        'Board is syncing. Please try again in a few seconds.'
      )
      return
    }
    const projectId = requireProjectId()
    if (!projectId) return

    const name = createStatusName.trim()
    const slug = slugifyStatusName(name)

    if (!name) {
      createStatusError = t('task.workflow.status_name_required', {}, 'Status name is required')
      return
    }

    if (!slug) {
      createStatusError = t('task.workflow.status_name_invalid', {}, 'Status name is invalid')
      return
    }

    if (!createStatusCategory) {
      createStatusError = t('task.workflow.status_group_required', {}, 'Status group is required')
      return
    }

    createStatusSubmitting = true
    createStatusError = ''

    try {
      await createTaskStatusDefinition(
        {
          name,
          slug,
          group: createStatusCategory,
          color: createStatusColor,
          description: createStatusDescription.trim(),
          sortOrder: getStatuses().length,
        },
        projectId
      )
      notificationStore.success(t('task.workflow.create_success', {}, 'New status created'))
      createStatusModalOpen = false
      createStatusName = ''
      createStatusCategory = ''
      createStatusDescription = ''
      createStatusColor = '#6B7280'
      router.reload({ only: ['metadata', 'tasks', 'flash'] })
    } catch (error: unknown) {
      createStatusError = getStatusMutationErrorMessage(
        error,
        t('task.workflow.create_error', {}, 'Unable to create status')
      )
      notificationStore.error(
        t('task.workflow.create_failed', {}, 'Status creation failed'),
        createStatusError
      )
    } finally {
      createStatusSubmitting = false
    }
  }

  function handleCreateStatusDialogClose() {
    createStatusModalOpen = false
    createStatusName = ''
    createStatusCategory = ''
    createStatusDescription = ''
    createStatusColor = '#6B7280'
    createStatusError = ''
  }

  return {
    get createStatusModalOpen() {
      return createStatusModalOpen
    },
    set createStatusModalOpen(value: boolean) {
      createStatusModalOpen = value
    },
    get createStatusName() {
      return createStatusName
    },
    set createStatusName(value: string) {
      createStatusName = value
    },
    get createStatusCategory() {
      return createStatusCategory
    },
    set createStatusCategory(value: TaskStatusCategory | '') {
      createStatusCategory = value
    },
    get createStatusDescription() {
      return createStatusDescription
    },
    set createStatusDescription(value: string) {
      createStatusDescription = value
    },
    get createStatusColor() {
      return createStatusColor
    },
    set createStatusColor(value: string) {
      createStatusColor = value
    },
    get createStatusError() {
      return createStatusError
    },
    get createStatusSubmitting() {
      return createStatusSubmitting
    },
    handleCreateStatusClick,
    handleCreateStatusSubmit,
    handleCreateStatusDialogClose,
  }
}
