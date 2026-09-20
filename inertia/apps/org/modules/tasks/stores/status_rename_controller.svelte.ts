import { router } from '@inertiajs/svelte'

import { updateTaskStatusDefinition } from '@/apps/org/modules/tasks/api/status_management_api'
import {
  findStatusDefinition,
  getStatusMutationErrorMessage,
  slugifyStatusName,
  type TaskStatusDefinition,
} from '@/apps/org/modules/tasks/lib/helpers/status_management_helpers'
import type { TaskMetadata } from '@/apps/org/modules/tasks/types/index.svelte'
import { notificationStore } from '@/apps/org/shared/stores/notification_store.svelte'
import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

export interface StatusRenamePayload {
  status: string
  label: string
}

export interface StatusRenameTarget extends StatusRenamePayload {
  id?: string
}

interface RenameStatusControllerOptions {
  getStatuses: () => TaskMetadata['statuses']
  getStatusDefinitions: () => TaskStatusDefinition[]
  requireProjectId: () => string | null
  canManageWorkflow: () => boolean
  hasStatusMutationLock: () => boolean
  isBoardReady: (actionErrorMessage: string) => boolean
}

export function createStatusRenameController({
  getStatuses,
  getStatusDefinitions,
  requireProjectId,
  canManageWorkflow,
  hasStatusMutationLock,
  isBoardReady,
}: RenameStatusControllerOptions) {
  const { t } = useTranslation()

  let renameStatusModalOpen = $state(false)
  let renameStatusSubmitting = $state(false)
  let renameStatusError = $state('')
  let renameStatusName = $state('')
  let renameStatusColor = $state('#6B7280')
  let statusRenameTarget = $state<StatusRenameTarget | null>(null)

  function handleRenameStatusClick(payload: StatusRenamePayload) {
    if (!canManageWorkflow()) {
      notificationStore.error(
        t('task.workflow.permission_title', {}, 'You do not have permission to manage workflow'),
        t(
          'task.workflow.rename_permission_message',
          {},
          'Only users with workflow permission can rename statuses.'
        )
      )
      return
    }
    if (
      !isBoardReady(
        t(
          'task.workflow.rename_wait_message',
          {},
          'Please wait for drag-and-drop changes to finish before renaming a status.'
        )
      )
    ) {
      return
    }
    if (!requireProjectId()) return

    const definition = findStatusDefinition(getStatusDefinitions(), payload.status)
    statusRenameTarget = { ...payload, id: definition?.id }
    renameStatusName = payload.label
    renameStatusColor =
      getStatuses().find((status) => status.value === payload.status || status.slug === payload.status)
        ?.color ?? '#6B7280'
    renameStatusError = ''
    renameStatusModalOpen = true
  }

  async function handleRenameStatusSubmit() {
    if (!canManageWorkflow()) {
      renameStatusError = t(
        'task.workflow.no_permission_error',
        {},
        'You do not have permission to manage workflow.'
      )
      return
    }
    if (hasStatusMutationLock()) {
      renameStatusError = t(
        'task.workflow.board_sync_retry_error',
        {},
        'Board is syncing. Please try again in a few seconds.'
      )
      return
    }
    const projectId = requireProjectId()
    if (!projectId) return
    if (!statusRenameTarget?.id) {
      renameStatusError = t(
        'task.workflow.rename_missing_target',
        {},
        'Unable to rename this status.'
      )
      return
    }

    const name = renameStatusName.trim()
    const slug = slugifyStatusName(name)
    if (!name) {
      renameStatusError = t('task.workflow.status_name_required', {}, 'Status name is required')
      return
    }
    if (!slug) {
      renameStatusError = t('task.workflow.status_name_invalid', {}, 'Status name is invalid')
      return
    }

    renameStatusSubmitting = true
    renameStatusError = ''
    try {
      await updateTaskStatusDefinition(statusRenameTarget.id, { name, slug, color: renameStatusColor }, projectId)
      notificationStore.success(t('task.workflow.rename_success', {}, 'Status renamed'))
      handleRenameStatusDialogClose()
      router.reload({ only: ['metadata', 'tasks', 'flash'] })
    } catch (error: unknown) {
      renameStatusError = getStatusMutationErrorMessage(
        error,
        t('task.workflow.rename_error', {}, 'Unable to rename status')
      )
      notificationStore.error(
        t('task.workflow.rename_failed', {}, 'Status rename failed'),
        renameStatusError
      )
    } finally {
      renameStatusSubmitting = false
    }
  }

  function handleRenameStatusDialogClose() {
    renameStatusModalOpen = false
    renameStatusError = ''
    renameStatusName = ''
    renameStatusColor = '#6B7280'
    statusRenameTarget = null
  }

  return {
    get renameStatusModalOpen() {
      return renameStatusModalOpen
    },
    set renameStatusModalOpen(value: boolean) {
      renameStatusModalOpen = value
    },
    get renameStatusName() {
      return renameStatusName
    },
    set renameStatusName(value: string) {
      renameStatusName = value
    },
    get renameStatusColor() {
      return renameStatusColor
    },
    set renameStatusColor(value: string) {
      renameStatusColor = value
    },
    get renameStatusError() {
      return renameStatusError
    },
    get renameStatusSubmitting() {
      return renameStatusSubmitting
    },
    get statusRenameTarget() {
      return statusRenameTarget
    },
    handleRenameStatusClick,
    handleRenameStatusSubmit,
    handleRenameStatusDialogClose,
  }
}
