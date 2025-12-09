import { router } from '@inertiajs/svelte'


import {
  createTaskStatusDefinition,
  deleteTaskStatusDefinition,
  updateTaskStatusDefinition,
} from '@/apps/org/modules/tasks/api/status_management_api'
import {
  buildStatusDefinitions,
  canDeleteStatusDefinition,
  findStatusDefinition,
  getStatusMutationErrorMessage,
  slugifyStatusName,
} from '@/apps/org/modules/tasks/lib/helpers/status_management_helpers'
import type { TaskMetadata, TaskStatusCategory } from '@/apps/org/modules/tasks/types/index.svelte'
import { notificationStore } from '@/apps/org/shared/stores/notification_store.svelte'
import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'

interface StatusDeletePayload {
  status: string
  label: string
  taskCount: number
}

interface StatusDeleteTarget extends StatusDeletePayload {
  id?: string
  isSystem?: boolean
}

interface StatusRenamePayload {
  status: string
  label: string
}

interface StatusRenameTarget extends StatusRenamePayload {
  id?: string
}

interface ControllerOptions {
  getStatuses: () => TaskMetadata['statuses']
  canManageWorkflow: () => boolean
  isBoardMutationLocked: () => boolean
}

export function createStatusManagementController({
  getStatuses,
  canManageWorkflow,
  isBoardMutationLocked,
}: ControllerOptions) {
  const { t } = useTranslation()

  let createStatusModalOpen = $state(false)
  let createStatusName = $state('')
  let createStatusCategory = $state<TaskStatusCategory | ''>('')
  let createStatusDescription = $state('')
  let createStatusColor = $state('#6B7280')
  let createStatusSubmitting = $state(false)
  let createStatusError = $state('')

  let deleteStatusModalOpen = $state(false)
  let deleteStatusSubmitting = $state(false)
  let deleteStatusError = $state('')
  let statusDeleteTarget = $state<StatusDeleteTarget | null>(null)
  let renameStatusModalOpen = $state(false)
  let renameStatusSubmitting = $state(false)
  let renameStatusError = $state('')
  let renameStatusName = $state('')
  let statusRenameTarget = $state<StatusRenameTarget | null>(null)
  let reorderStatusesSubmitting = $state(false)

  const statusDefinitions = $derived(buildStatusDefinitions(getStatuses()))
  const hasDeleteTargetTasks = $derived((statusDeleteTarget?.taskCount ?? 0) > 0)
  const isStatusMutationLocked = $derived(hasStatusMutationLock())

  function hasStatusMutationLock(): boolean {
    return (
      isBoardMutationLocked() ||
      createStatusSubmitting ||
      deleteStatusSubmitting ||
      renameStatusSubmitting ||
      reorderStatusesSubmitting
    )
  }

  function isBoardReady(actionErrorMessage: string): boolean {
    if (!hasStatusMutationLock()) return true
    notificationStore.error(t('task.workflow.board_sync_title', {}, 'Board is syncing'), actionErrorMessage)
    return false
  }

  function handleCreateStatusClick() {
    if (!canManageWorkflow()) {
      notificationStore.error(
        t('task.workflow.permission_title', {}, 'You do not have permission to manage workflow'),
        t('task.workflow.create_permission_message', {}, 'Only users with workflow permission can add statuses.')
      )
      return
    }

    if (!isBoardReady(t('task.workflow.manage_wait_message', {}, 'Please wait for drag-and-drop changes to finish before managing statuses.'))) return
    createStatusModalOpen = true
    createStatusError = ''
  }

  async function handleCreateStatusSubmit() {
    if (!canManageWorkflow()) {
      createStatusError = t('task.workflow.no_permission_error', {}, 'You do not have permission to manage workflow.')
      return
    }

    if (hasStatusMutationLock()) {
      createStatusError = t('task.workflow.board_sync_retry_error', {}, 'Board is syncing. Please try again in a few seconds.')
      return
    }

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
      await createTaskStatusDefinition({
        name,
        slug,
        group: createStatusCategory,
        color: createStatusColor,
        description: createStatusDescription.trim(),
        sortOrder: getStatuses().length,
      })
      notificationStore.success(t('task.workflow.create_success', {}, 'New status created'))
      createStatusModalOpen = false
      createStatusName = ''
      createStatusCategory = ''
      createStatusDescription = ''
      createStatusColor = '#6B7280'
      router.reload({ only: ['metadata', 'tasks', 'flash'] })
    } catch (error: unknown) {
      createStatusError = getStatusMutationErrorMessage(error, t('task.workflow.create_error', {}, 'Unable to create status'))
      notificationStore.error(t('task.workflow.create_failed', {}, 'Status creation failed'), createStatusError)
    } finally {
      createStatusSubmitting = false
    }
  }

  function canDeleteStatus(status: string): boolean {
    return canDeleteStatusDefinition(statusDefinitions, status, canManageWorkflow())
  }

  function handleDeleteStatusClick(payload: StatusDeletePayload) {
    if (!canManageWorkflow()) {
      notificationStore.error(
        t('task.workflow.permission_title', {}, 'You do not have permission to manage workflow'),
        t('task.workflow.delete_permission_message', {}, 'Only users with workflow permission can delete statuses.')
      )
      return
    }

    if (!isBoardReady(t('task.workflow.delete_wait_message', {}, 'Please wait for drag-and-drop changes to finish before deleting a status.'))) return

    const definition = findStatusDefinition(statusDefinitions, payload.status)
    statusDeleteTarget = {
      ...payload,
      id: definition?.id,
      isSystem: definition?.is_system,
    }
    deleteStatusError = ''
    deleteStatusModalOpen = true
  }

  function handleRenameStatusClick(payload: StatusRenamePayload) {
    if (!canManageWorkflow()) {
      notificationStore.error(
        t('task.workflow.permission_title', {}, 'You do not have permission to manage workflow'),
        t('task.workflow.rename_permission_message', {}, 'Only users with workflow permission can rename statuses.')
      )
      return
    }

    if (!isBoardReady(t('task.workflow.rename_wait_message', {}, 'Please wait for drag-and-drop changes to finish before renaming a status.'))) return

    const definition = findStatusDefinition(statusDefinitions, payload.status)
    statusRenameTarget = {
      ...payload,
      id: definition?.id,
    }
    renameStatusName = payload.label
    renameStatusError = ''
    renameStatusModalOpen = true
  }

  async function handleRenameStatusSubmit() {
    if (!canManageWorkflow()) {
      renameStatusError = t('task.workflow.no_permission_error', {}, 'You do not have permission to manage workflow.')
      return
    }

    if (hasStatusMutationLock()) {
      renameStatusError = t('task.workflow.board_sync_retry_error', {}, 'Board is syncing. Please try again in a few seconds.')
      return
    }

    if (!statusRenameTarget?.id) {
      renameStatusError = t('task.workflow.rename_missing_target', {}, 'Unable to rename this status.')
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
      await updateTaskStatusDefinition(statusRenameTarget.id, { name, slug })
      notificationStore.success(t('task.workflow.rename_success', {}, 'Status renamed'))
      renameStatusModalOpen = false
      statusRenameTarget = null
      renameStatusName = ''
      router.reload({ only: ['metadata', 'tasks', 'flash'] })
    } catch (error: unknown) {
      renameStatusError = getStatusMutationErrorMessage(error, t('task.workflow.rename_error', {}, 'Unable to rename status'))
      notificationStore.error(t('task.workflow.rename_failed', {}, 'Status rename failed'), renameStatusError)
    } finally {
      renameStatusSubmitting = false
    }
  }

  async function handleReorderStatuses(payload: {
    orderedStatusIds: string[]
    previousStatusIds: string[]
  }) {
    if (!canManageWorkflow()) {
      notificationStore.error(
        t('task.workflow.permission_title', {}, 'You do not have permission to manage workflow'),
        t('task.workflow.reorder_permission_message', {}, 'Only users with workflow permission can reorder statuses.')
      )
      throw new Error(t('task.workflow.permission_denied_error', {}, 'Workflow permission denied'))
    }

    if (hasStatusMutationLock()) {
      notificationStore.error(
        t('task.workflow.board_sync_title', {}, 'Board is syncing'),
        t('task.workflow.current_operation_wait_message', {}, 'Please wait for the current operation to finish.')
      )
      throw new Error(t('task.workflow.status_mutation_locked_error', {}, 'Status mutation locked'))
    }

    const allowedStatusIds = new Set(getStatuses().map((status) => status.value))
    const orderedStatusIds = payload.orderedStatusIds.filter((statusId) =>
      allowedStatusIds.has(statusId)
    )

    if (orderedStatusIds.length <= 1) return

    reorderStatusesSubmitting = true

    try {
      await Promise.all(
        orderedStatusIds.map((statusId, index) =>
          updateTaskStatusDefinition(statusId, {
            sortOrder: index + 1,
          })
        )
      )
      notificationStore.success(t('task.workflow.reorder_success', {}, 'Status order updated'))
      router.reload({ only: ['metadata', 'tasks', 'flash'] })
    } catch (error: unknown) {
      const message = getStatusMutationErrorMessage(error, t('task.workflow.reorder_error', {}, 'Unable to reorder statuses'))
      notificationStore.error(t('task.workflow.reorder_failed', {}, 'Status reorder failed'), message)
      throw error
    } finally {
      reorderStatusesSubmitting = false
    }
  }

  async function confirmDeleteStatus() {
    if (!canManageWorkflow()) {
      deleteStatusError = t('task.workflow.no_permission_error', {}, 'You do not have permission to manage workflow.')
      return
    }

    if (hasStatusMutationLock()) {
      deleteStatusError = t('task.workflow.board_sync_retry_error', {}, 'Board is syncing. Please try again in a few seconds.')
      return
    }

    if (!statusDeleteTarget?.id) {
      deleteStatusError = t('task.workflow.delete_missing_target', {}, 'Unable to delete this status.')
      return
    }

    if (statusDeleteTarget.isSystem) {
      deleteStatusError = t('task.workflow.delete_system_status_error', {}, 'System statuses cannot be deleted.')
      return
    }

    if (statusDeleteTarget.taskCount > 0) {
      deleteStatusError = t('task.workflow.delete_has_tasks_error', {}, 'This status still has tasks. Move tasks to another column before deleting it.')
      return
    }

    deleteStatusSubmitting = true
    deleteStatusError = ''

    try {
      await deleteTaskStatusDefinition(statusDeleteTarget.id)
      notificationStore.success(t('task.workflow.delete_success', {}, 'Status deleted'))
      deleteStatusModalOpen = false
      statusDeleteTarget = null
      router.reload({ only: ['metadata', 'tasks', 'flash'] })
    } catch (error: unknown) {
      deleteStatusError = getStatusMutationErrorMessage(error, t('task.workflow.delete_error', {}, 'Unable to delete status'))
      notificationStore.error(t('task.workflow.delete_failed', {}, 'Status deletion failed'), deleteStatusError)
    } finally {
      deleteStatusSubmitting = false
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

  function handleDeleteStatusDialogClose() {
    deleteStatusModalOpen = false
    deleteStatusError = ''
    statusDeleteTarget = null
  }

  function handleRenameStatusDialogClose() {
    renameStatusModalOpen = false
    renameStatusError = ''
    renameStatusName = ''
    statusRenameTarget = null
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
    get renameStatusError() {
      return renameStatusError
    },
    get renameStatusSubmitting() {
      return renameStatusSubmitting
    },
    get reorderStatusesSubmitting() {
      return reorderStatusesSubmitting
    },
    get statusRenameTarget() {
      return statusRenameTarget
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
    handleCreateStatusClick,
    handleCreateStatusSubmit,
    canDeleteStatus,
    handleDeleteStatusClick,
    confirmDeleteStatus,
    handleRenameStatusClick,
    handleRenameStatusSubmit,
    handleReorderStatuses,
    handleCreateStatusDialogClose,
    handleDeleteStatusDialogClose,
    handleRenameStatusDialogClose,
  }
}
