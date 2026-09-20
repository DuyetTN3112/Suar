import { normalizeTaskMutationError } from '@/apps/org/modules/tasks/lib/errors/task_mutation_errors'
import type { TaskDetail } from '@/apps/org/modules/tasks/types/index.svelte'
import { notificationStore } from '@/apps/org/shared/stores/notification_store.svelte'
import { useTranslation } from '@/apps/org/shared/stores/translation.svelte'
import { createTaskStoreCore } from '@/apps/shared/tasks/stores/create_task_store_core.svelte'
import type {
  TaskLayout,
  TaskFilters,
  TaskDisplayProperties,
  TaskSortConfig,
  TaskScopeSnapshot,
  TaskStoreOptions,
} from '@/apps/shared/tasks/task_store_types'

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
