import axios from 'axios'
import type { Task } from '../types.svelte'

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
      const response = await axios.get('/api/tasks/check-create-permission')

      if (response.data.success && response.data.canCreate) {
        createModalOpen = true
      } else {
        alert('Bạn không có quyền tạo nhiệm vụ mới. Chỉ admin và superadmin mới có quyền này.')
      }
    } catch (error) {
      console.error('Error checking permission:', error)

      // Fallback: Hiển thị modal trong trường hợp lỗi
      createModalOpen = true
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
