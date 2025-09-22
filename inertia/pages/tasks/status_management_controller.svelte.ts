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
import type { TaskMetadata, TaskStatusCategory } from './types.svelte'

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
  let createStatusCategory = $state<TaskStatusCategory | ''>('')
  let createStatusDescription = $state('')
  let createStatusColor = $state('#6B7280')
  let createStatusSubmitting = $state(false)
  let createStatusError = $state('')

  let deleteStatusModalOpen = $state(false)
  let deleteStatusSubmitting = $state(false)
  let deleteStatusError = $state('')
  let statusDeleteTarget = $state<StatusDeleteTarget | null>(null)

  const statusDefinitions = $derived(buildStatusDefinitions(getStatuses()))
  const hasDeleteTargetTasks = $derived((statusDeleteTarget?.taskCount ?? 0) > 0)
  const isStatusMutationLocked = $derived(hasStatusMutationLock())

  function hasStatusMutationLock(): boolean {
    return isBoardMutationLocked() || createStatusSubmitting || deleteStatusSubmitting
  }

  function isBoardReady(actionErrorMessage: string): boolean {
    if (!hasStatusMutationLock()) return true
    notificationStore.error('Board dang dong bo', actionErrorMessage)
    return false
  }

  function handleCreateStatusClick() {
    if (!canManageWorkflow()) {
      notificationStore.error('Bạn không đủ quyền quản lý workflow', 'Chỉ người có quyền workflow mới được thêm trạng thái.')
      return
    }

    if (!isBoardReady('Vui long doi thao tac keo-tha hoan tat truoc khi quan ly trang thai.')) return
    createStatusModalOpen = true
    createStatusError = ''
  }

  async function handleCreateStatusSubmit() {
    if (!canManageWorkflow()) {
      createStatusError = 'Bạn không đủ quyền quản lý workflow.'
      return
    }

    if (hasStatusMutationLock()) {
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

    if (!createStatusCategory) {
      createStatusError = 'Nhóm trạng thái là bắt buộc'
      return
    }

    createStatusSubmitting = true
    createStatusError = ''

    try {
      await createTaskStatusDefinition({
        name,
        slug,
        category: createStatusCategory,
        color: createStatusColor,
        description: createStatusDescription.trim(),
        sortOrder: getStatuses().length,
      })
      notificationStore.success('Đã tạo trạng thái mới')
      createStatusModalOpen = false
      createStatusName = ''
      createStatusCategory = ''
      createStatusDescription = ''
      createStatusColor = '#6B7280'
      router.reload({ only: ['metadata', 'tasks', 'flash'] })
    } catch (error: unknown) {
      createStatusError = getStatusMutationErrorMessage(error, 'Không thể tạo trạng thái')
      notificationStore.error('Tạo trạng thái thất bại', createStatusError)
    } finally {
      createStatusSubmitting = false
    }
  }

  function canDeleteStatus(status: string): boolean {
    return canDeleteStatusDefinition(statusDefinitions, status, canManageWorkflow())
  }

  function handleDeleteStatusClick(payload: StatusDeletePayload) {
    if (!canManageWorkflow()) {
      notificationStore.error('Bạn không đủ quyền quản lý workflow', 'Chỉ người có quyền workflow mới được xoá trạng thái.')
      return
    }

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
    if (!canManageWorkflow()) {
      deleteStatusError = 'Bạn không đủ quyền quản lý workflow.'
      return
    }

    if (hasStatusMutationLock()) {
      deleteStatusError = 'Board dang dong bo. Vui long thu lai sau it giay.'
      return
    }

    if (!statusDeleteTarget?.id) {
      deleteStatusError = 'Không thể xoá trạng thái này.'
      return
    }

    if (statusDeleteTarget.isSystem) {
      deleteStatusError = 'Không thể xoá trạng thái hệ thống.'
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
      notificationStore.error('Xoá trạng thái thất bại', deleteStatusError)
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
    handleCreateStatusDialogClose,
    handleDeleteStatusDialogClose,
  }
}
