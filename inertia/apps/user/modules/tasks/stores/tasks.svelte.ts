import { createTaskStoreCore } from '@/apps/shared/tasks/stores/create_task_store_core.svelte'
import type {
  TaskLayout,
  TaskFilters,
  TaskDisplayProperties,
  TaskSortConfig,
  TaskScopeSnapshot,
  TaskStoreOptions,
} from '@/apps/shared/tasks/task_store_types'
import { normalizeTaskMutationError } from '@/apps/user/modules/tasks/lib/errors/task_mutation_errors'
import type { TaskDetail } from '@/apps/user/modules/tasks/types/index.svelte'
import { notificationStore } from '@/apps/user/shared/stores/notification_store.svelte'
import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

export type {
  TaskLayout,
  TaskFilters,
  TaskDisplayProperties,
  TaskSortConfig,
  TaskScopeSnapshot,
  TaskStoreOptions,
}

export function createTaskStore(options: TaskStoreOptions = {}) {
  const { t: translate } = useTranslation()

  return createTaskStoreCore<TaskDetail>({
    normalizeTaskMutationError: (error, fallback) =>
      normalizeTaskMutationError(error, fallback),
    notificationStore,
    translate,
    options,
  })
}

export type TaskStore = ReturnType<typeof createTaskStore>
