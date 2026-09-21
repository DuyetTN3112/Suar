import { router } from '@inertiajs/svelte'

import {
  deleteTaskStatusDefinition,
  updateTaskStatusDefinition,
} from '@/apps/user/modules/tasks/api/status_management_api'
import {
  buildStatusDefinitions,
  canDeleteStatusDefinition,
  findStatusDefinition,
  getStatusMutationErrorMessage,
} from '@/apps/user/modules/tasks/lib/helpers/status_management_helpers'
import type { TaskMetadata } from '@/apps/user/modules/tasks/types/index.svelte'
import { notificationStore } from '@/apps/user/shared/stores/notification_store.svelte'
import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

import { createStatusCreateController } from './status_create_controller.svelte.js'
import {
  createStatusRenameController,
  type StatusRenamePayload,
  type StatusRenameTarget,
} from './status_rename_controller.svelte.js'

export type { StatusRenamePayload, StatusRenameTarget }

export interface StatusDeletePayload {
  status: string
  label: string
  taskCount: number
}

export interface StatusDeleteTarget extends StatusDeletePayload {
  id?: string
  isSystem?: boolean
}

interface ControllerOptions {
  getStatuses: () => TaskMetadata['statuses']
  getProjectId: () => string | null
  canManageWorkflow: () => boolean
  isBoardMutationLocked: () => boolean
}

export function createStatusManagementController({
  getStatuses,
  getProjectId,
  canManageWorkflow,
  isBoardMutationLocked,
}: ControllerOptions) {
  const { t } = useTranslation()

  let deleteStatusModalOpen = $state(false)
  let deleteStatusSubmitting = $state(false)
  let deleteStatusError = $state('')
  let statusDeleteTarget = $state<StatusDeleteTarget | null>(null)
  let reorderStatusesSubmitting = $state(false)

  const statusDefinitions = $derived(buildStatusDefinitions(getStatuses()))
  const hasDeleteTargetTasks = $derived((statusDeleteTarget?.taskCount ?? 0) > 0)
  const isStatusMutationLocked = $derived(hasStatusMutationLock())

  function hasStatusMutationLock(): boolean {
    return (
      isBoardMutationLocked() ||
      createController.createStatusSubmitting ||
      deleteStatusSubmitting ||
      renameController.renameStatusSubmitting ||
      reorderStatusesSubmitting
    )
  }

  function isBoardReady(actionErrorMessage: string): boolean {
    if (!hasStatusMutationLock()) return true
    notificationStore.error(
      t('task.workflow.board_sync_title', {}, 'Board is syncing'),
      actionErrorMessage
    )
    return false
  }

  function requireProjectId(): string | null {
    const projectId = getProjectId()
    if (projectId) return projectId

    notificationStore.error(
      t('task.workflow.project_required_title', {}, 'Select a project'),
      t(
        'task.workflow.project_required_message',
        {},
        'Task statuses belong to a project. Select a project before managing its workflow.'
      )
    )
    return null
  }

  const createController = createStatusCreateController({
    getStatuses,
    requireProjectId,
    canManageWorkflow,
    hasStatusMutationLock,
    isBoardReady,
  })

  const renameController = createStatusRenameController({
    getStatuses,
    getStatusDefinitions: () => statusDefinitions,
    requireProjectId,
    canManageWorkflow,
    hasStatusMutationLock,
    isBoardReady,
  })

  function canDeleteStatus(status: string): boolean {
    return canDeleteStatusDefinition(statusDefinitions, status, canManageWorkflow())
  }

  function handleDeleteStatusClick(payload: StatusDeletePayload) {
    if (!canManageWorkflow()) {
      notificationStore.error(
        t('task.workflow.permission_title', {}, 'You do not have permission to manage workflow'),
        t(
          'task.workflow.delete_permission_message',
          {},
          'Only users with workflow permission can delete statuses.'
        )
      )
      return
    }

    if (
      !isBoardReady(
        t(
          'task.workflow.delete_wait_message',
          {},
          'Please wait for drag-and-drop changes to finish before deleting a status.'
        )
      )
    ) {
      return
    }
    if (!requireProjectId()) return

    const definition = findStatusDefinition(statusDefinitions, payload.status)
    statusDeleteTarget = {
      ...payload,
      id: definition?.id,
      isSystem: definition?.is_system,
    }
    deleteStatusError = ''
    deleteStatusModalOpen = true
  }

  async function handleReorderStatuses(payload: {
    orderedStatusIds: string[]
    previousStatusIds: string[]
  }) {
    if (!canManageWorkflow()) throw new Error('Workflow permission denied')
    if (hasStatusMutationLock()) throw new Error('Status mutation locked')
    const projectId = requireProjectId()
    if (!projectId) throw new Error('Project is required')

    const allowedStatusIds = new Set(getStatuses().map((status) => status.value))
    const orderedStatusIds = payload.orderedStatusIds.filter((statusId) =>
      allowedStatusIds.has(statusId)
    )
    if (orderedStatusIds.length <= 1) return

    reorderStatusesSubmitting = true
    try {
      await Promise.all(
        orderedStatusIds.map((statusId, index) =>
          updateTaskStatusDefinition(statusId, { sortOrder: index + 1 }, projectId)
        )
      )
      notificationStore.success(t('task.workflow.reorder_success', {}, 'Status order updated'))
      router.reload({ only: ['metadata', 'tasks', 'flash'] })
    } catch (error: unknown) {
      const message = getStatusMutationErrorMessage(
        error,
        t('task.workflow.reorder_error', {}, 'Unable to reorder statuses')
      )
      notificationStore.error(
        t('task.workflow.reorder_failed', {}, 'Status reorder failed'),
        message
      )
      throw error
    } finally {
      reorderStatusesSubmitting = false
    }
  }

  async function confirmDeleteStatus() {
    if (!canManageWorkflow()) {
      deleteStatusError = t(
        'task.workflow.no_permission_error',
        {},
        'You do not have permission to manage workflow.'
      )
      return
    }

    if (hasStatusMutationLock()) {
      deleteStatusError = t(
        'task.workflow.board_sync_retry_error',
        {},
        'Board is syncing. Please try again in a few seconds.'
      )
      return
    }
    const projectId = requireProjectId()
    if (!projectId) return

    if (!statusDeleteTarget?.id) {
      deleteStatusError = t(
        'task.workflow.delete_missing_target',
        {},
        'Unable to delete this status.'
      )
      return
    }

    if (statusDeleteTarget.isSystem) {
      deleteStatusError = t(
        'task.workflow.delete_system_status_error',
        {},
        'System statuses cannot be deleted.'
      )
      return
    }

    if (statusDeleteTarget.taskCount > 0) {
      deleteStatusError = t(
        'task.workflow.delete_has_tasks_error',
        {},
        'This status still has tasks. Move tasks to another column before deleting it.'
      )
      return
    }

    deleteStatusSubmitting = true
    deleteStatusError = ''

    try {
      await deleteTaskStatusDefinition(statusDeleteTarget.id, projectId)
      notificationStore.success(t('task.workflow.delete_success', {}, 'Status deleted'))
      deleteStatusModalOpen = false
      statusDeleteTarget = null
      router.reload({ only: ['metadata', 'tasks', 'flash'] })
    } catch (error: unknown) {
      deleteStatusError = getStatusMutationErrorMessage(
        error,
        t('task.workflow.delete_error', {}, 'Unable to delete status')
      )
      notificationStore.error(
        t('task.workflow.delete_failed', {}, 'Status deletion failed'),
        deleteStatusError
      )
    } finally {
      deleteStatusSubmitting = false
    }
  }

  function handleDeleteStatusDialogClose() {
    deleteStatusModalOpen = false
    deleteStatusError = ''
    statusDeleteTarget = null
  }

  return {
    get createStatusModalOpen() {
      return createController.createStatusModalOpen
    },
    set createStatusModalOpen(value: boolean) {
      createController.createStatusModalOpen = value
    },
    get createStatusName() {
      return createController.createStatusName
    },
    set createStatusName(value: string) {
      createController.createStatusName = value
    },
    get createStatusCategory() {
      return createController.createStatusCategory
    },
    set createStatusCategory(value) {
      createController.createStatusCategory = value
    },
    get createStatusDescription() {
      return createController.createStatusDescription
    },
    set createStatusDescription(value: string) {
      createController.createStatusDescription = value
    },
    get createStatusColor() {
      return createController.createStatusColor
    },
    set createStatusColor(value: string) {
      createController.createStatusColor = value
    },
    get createStatusError() {
      return createController.createStatusError
    },
    get createStatusSubmitting() {
      return createController.createStatusSubmitting
    },
    get deleteStatusModalOpen() {
      return deleteStatusModalOpen
    },
    set deleteStatusModalOpen(value: boolean) {
      deleteStatusModalOpen = value
    },
    get deleteStatusError() {
      return deleteStatusError
    },
    get deleteStatusSubmitting() {
      return deleteStatusSubmitting
    },
    get renameStatusModalOpen() {
      return renameController.renameStatusModalOpen
    },
    set renameStatusModalOpen(value: boolean) {
      renameController.renameStatusModalOpen = value
    },
    get renameStatusName() {
      return renameController.renameStatusName
    },
    set renameStatusName(value: string) {
      renameController.renameStatusName = value
    },
    get renameStatusColor() {
      return renameController.renameStatusColor
    },
    set renameStatusColor(value: string) {
      renameController.renameStatusColor = value
    },
    get renameStatusError() {
      return renameController.renameStatusError
    },
    get renameStatusSubmitting() {
      return renameController.renameStatusSubmitting
    },
    get statusRenameTarget() {
      return renameController.statusRenameTarget
    },
    get statusDeleteTarget() {
      return statusDeleteTarget
    },
    get hasDeleteTargetTasks() {
      return hasDeleteTargetTasks
    },
    get isStatusMutationLocked() {
      return isStatusMutationLocked
    },
    handleCreateStatusClick: createController.handleCreateStatusClick,
    handleCreateStatusSubmit: createController.handleCreateStatusSubmit,
    canDeleteStatus,
    handleDeleteStatusClick,
    handleRenameStatusClick: renameController.handleRenameStatusClick,
    handleRenameStatusSubmit: renameController.handleRenameStatusSubmit,
    handleReorderStatuses,
    confirmDeleteStatus,
    handleCreateStatusDialogClose: createController.handleCreateStatusDialogClose,
    handleDeleteStatusDialogClose,
    handleRenameStatusDialogClose: renameController.handleRenameStatusDialogClose,
  }
}
