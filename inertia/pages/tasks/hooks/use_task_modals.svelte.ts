import axios from 'axios'

import { notificationStore } from '@/stores/notification_store.svelte'

import type { Task } from '../types.svelte'

interface CreateTaskPermissionResponse {
  success: boolean
  canCreate: boolean
  reason?: string | null
}

export function createTaskModalsStore() {
  let createModalOpen = $state(false)
  let importModalOpen = $state(false)
  let detailModalOpen = $state<boolean>(false)
  let selectedTaskId = $state<string | null>(null)
  let selectedTask = $state<Task | null>(null)
  let isCheckingPermission = $state(false)

  // Mở modal tạo task mới
  async function handleCreateClick() {
    try {
      isCheckingPermission = true

      // Gọi API để kiểm tra quyền
      const response = await axios.get<CreateTaskPermissionResponse>(
        '/api/tasks/check-create-permission'
      )

      if (response.data.success && response.data.canCreate) {
        createModalOpen = true
      } else {
        notificationStore.error(
          'Bạn không đủ quyền tạo nhiệm vụ',
          response.data.reason ??
            'Chỉ org_owner, org_admin hoặc project_manager của project đã chọn mới được tạo nhiệm vụ.'
        )
      }
    } catch (error) {
      console.error('Error checking permission:', error)
      notificationStore.error('Không kiểm tra được quyền tạo nhiệm vụ', 'Vui lòng thử lại sau.')
    } finally {
      isCheckingPermission = false
    }
  }

  // Mở modal import task
  function handleImportClick() {
    importModalOpen = true
  }

  // Mở modal chi tiết task
  function handleDetailClick(task: Task) {
    try {
      // Cập nhật state trước khi mở modal
      selectedTask = task
      selectedTaskId = task.id
      detailModalOpen = true
    } catch (error) {
      console.error('Error opening task detail modal:', error)
    }
  }

  // Reset trạng thái khi đóng modal
  function handleDetailClose(open: boolean) {
    detailModalOpen = open
    if (!open) {
      // Không xóa selectedTask và selectedTaskId ngay lập tức để tránh hiệu ứng "flash"
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
    importModalOpen: {
      get value() {
        return importModalOpen
      },
      set value(val: boolean) {
        importModalOpen = val
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
      set value(val: Task | null) {
        selectedTask = val
      },
    },
    get isCheckingPermission() {
      return isCheckingPermission
    },
    handleCreateClick,
    handleImportClick,
    handleDetailClick,
    handleDetailClose,
  }
}
