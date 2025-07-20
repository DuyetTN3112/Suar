import { router } from '@inertiajs/svelte'

import { notificationStore } from '@/stores/notification_store.svelte'

import {
  createTaskStatusDefinition,
  deleteTaskStatusDefinition,
} from './status_management_api'
import {
  buildStatusDefinitions,
  canDeleteStatusDefinition,
  findStatusDefinition,
  getStatusMutationErrorMessage,
  slugifyStatusName,
} from './status_management_helpers'
import type { TaskMetadata } from './types.svelte'

interface StatusDeletePayload {
  status: string
  label: string
  taskCount: number
}

interface StatusDeleteTarget extends StatusDeletePayload {
  id?: string
  isSystem?: boolean
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
  let createStatusModalOpen = $state(false)
  let createStatusName = $state('')
  let createStatusSubmitting = $state(false)
  let createStatusError = $state('')

  let deleteStatusModalOpen = $state(false)
  let deleteStatusSubmitting = $state(false)
  let deleteStatusError = $state('')
  let statusDeleteTarget = $state<StatusDeleteTarget | null>(null)

  const statusDefinitions = $derived(buildStatusDefinitions(getStatuses()))
  const hasDeleteTargetTasks = $derived((statusDeleteTarget?.taskCount ?? 0) > 0)

  function isBoardReady(actionErrorMessage?: string): boolean {
    if (!isBoardMutationLocked()) return true
    if (actionErrorMessage) {
      notificationStore.error('Board dang dong bo', actionErrorMessage)
    }
    return false
  }

  function handleCreateStatusClick() {
    if (!isBoardReady('Vui long doi thao tac keo-tha hoan tat truoc khi quan ly trang thai.')) return
    createStatusModalOpen = true
    createStatusError = ''
  }

  async function handleCreateStatusSubmit() {
    if (isBoardMutationLocked()) {
      createStatusError = 'Board dang dong bo. Vui long thu lai sau it giay.'
      return
    }

    const name = createStatusName.trim()
    const slug = slugifyStatusName(name)

    if (!name) {
      createStatusError = 'Tên trạng thái là bắt buộc'
      return
    }

    if (!slug) {
      createStatusError = 'Tên trạng thái không hợp lệ'
      return
    }

    createStatusSubmitting = true
    createStatusError = ''

    try {
      await createTaskStatusDefinition({ name, slug, sortOrder: getStatuses().length })
      notificationStore.success('Đã tạo trạng thái mới')
      createStatusModalOpen = false
      createStatusName = ''
      router.reload({ only: ['metadata', 'tasks', 'flash'] })
    } catch (error: unknown) {
      createStatusError = getStatusMutationErrorMessage(error, 'Không thể tạo trạng thái')
    } finally {
      createStatusSubmitting = false
    }
  }

  function canDeleteStatus(status: string): boolean {
    return canDeleteStatusDefinition(statusDefinitions, status, canManageWorkflow())
  }

  function handleDeleteStatusClick(payload: StatusDeletePayload) {
    if (!isBoardReady('Vui long doi thao tac keo-tha hoan tat truoc khi xoa trang thai.')) return

    const definition = findStatusDefinition(statusDefinitions, payload.status)
    statusDeleteTarget = {
      ...payload,
      id: definition?.id,
      isSystem: definition?.is_system,
    }
    deleteStatusError = ''
    deleteStatusModalOpen = true
  }

  async function confirmDeleteStatus() {
    if (isBoardMutationLocked()) {
      deleteStatusError = 'Board dang dong bo. Vui long thu lai sau it giay.'
      return
    }

    if (!statusDeleteTarget?.id) {
      deleteStatusError = 'Không thể xoá trạng thái này.'
      return
    }

    if (statusDeleteTarget.taskCount > 0) {
      deleteStatusError = 'Trạng thái còn task. Hãy chuyển task sang cột khác trước khi xoá.'
      return
    }

    deleteStatusSubmitting = true
    deleteStatusError = ''

    try {
      await deleteTaskStatusDefinition(statusDeleteTarget.id)
      notificationStore.success('Đã xoá trạng thái')
      deleteStatusModalOpen = false
      statusDeleteTarget = null
      router.reload({ only: ['metadata', 'tasks', 'flash'] })
    } catch (error: unknown) {
      deleteStatusError = getStatusMutationErrorMessage(error, 'Không thể xoá trạng thái')
    } finally {
      deleteStatusSubmitting = false
    }
  }

  function handleCreateStatusDialogClose() {
    createStatusModalOpen = false
    createStatusName = ''
    createStatusError = ''
  }

  function handleDeleteStatusDialogClose() {
    deleteStatusModalOpen = false
    deleteStatusError = ''
    statusDeleteTarget = null
  }

  return {
    createStatusModalOpen,
    createStatusName,
    createStatusError,
    createStatusSubmitting,
    deleteStatusModalOpen,
    deleteStatusError,
    deleteStatusSubmitting,
    statusDeleteTarget,
    hasDeleteTargetTasks,
    handleCreateStatusClick,
    handleCreateStatusSubmit,
    canDeleteStatus,
    handleDeleteStatusClick,
    confirmDeleteStatus,
    handleCreateStatusDialogClose,
    handleDeleteStatusDialogClose,
  }
}
