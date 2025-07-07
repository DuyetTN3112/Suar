import { router } from '@inertiajs/svelte'

import type { Task } from '../types.svelte'

import {
  createTaskFiltersStore,
  type TaskFilters,
  type TaskMetadata,
} from './use_task_filters.svelte'
import { createTaskModalsStore } from './use_task_modals.svelte'

interface TasksStateProps {
  initialFilters: TaskFilters
  metadata: TaskMetadata
}

export function createTaskStateStore({ initialFilters, metadata }: TasksStateProps) {
  // Sử dụng các stores đã tách
  const taskFilters = createTaskFiltersStore(initialFilters, metadata)
  const taskModals = createTaskModalsStore()

  // Chuyển đổi trạng thái task
  function toggleTaskStatus(task: Task, newStatus: string) {
    // Gửi request cập nhật trạng thái
    router.put(
      `/tasks/${task.id}/status`,
      {
        task_status_id: newStatus,
      },
      {
        preserveState: true,
        preserveScroll: true,
        only: ['tasks'],
      }
    )
  }

  return {
    // Export tất cả từ filters
    ...taskFilters,
    // Export tất cả từ modals
    ...taskModals,
    // Thêm toggle status
    toggleTaskStatus,
  }
}
