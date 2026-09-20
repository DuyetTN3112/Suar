import axios from 'axios'

import type { TaskDetail, TaskStatus } from '@/apps/user/modules/tasks/types/index.svelte'

import type {
  TaskStoreDependencies,
  TaskLayout,
  TaskFilters,
  TaskDisplayProperties,
  TaskSortConfig,
  TaskScopeSnapshot,
} from '../task_store_types'

import {
  defaultTaskFilters,
  defaultDisplayProperties,
  defaultSortConfig,
  filterTasks,
  sortTasks,
  groupTasksByStatus,
  hasActiveTaskFilters,
  sameTaskScope,
} from './task_filters'
import {
  isTaskDebugEnabled,
  debugTaskStore,
  executeMoveTaskStatus,
  executeReorderTask,
  executeBatchUpdateStatus,
  type TaskMutationContext,
} from './task_store_mutation_actions'

export { isTaskDebugEnabled, debugTaskStore }

export function createTaskStoreCore<TTask extends TaskDetail = TaskDetail>(
  deps: TaskStoreDependencies
) {
  const { normalizeTaskMutationError, notificationStore, translate, options = {} } = deps

  // ─── Core State ─────────────────────────────────────────────
  let tasksMap = $state<Record<string, TTask>>({})
  let activeLayout = $state<TaskLayout>('kanban')
  let isLoading = $state(false)
  let getCurrentScope = options.getCurrentScope

  let filters = $state<TaskFilters>(defaultTaskFilters())
  let displayProperties = $state<TaskDisplayProperties>(defaultDisplayProperties())
  let sortConfig = $state<TaskSortConfig>(defaultSortConfig())

  // Tracks in-flight optimistic requests for stale-state guards at page level.
  let optimisticInFlight = $state(0)
  let pendingSync = $state<TTask[] | null>(null)
  let groupedFetchSeq = 0
  let mutatingTaskIds = $state<Set<string>>(new Set())

  // ─── Derived State ──────────────────────────────────────────
  const allTasks = $derived(Object.values(tasksMap))
  const filteredTasks = $derived.by(() => filterTasks(allTasks, filters))
  const sortedTasks = $derived.by(() => sortTasks(filteredTasks, sortConfig))
  const tasksByStatus = $derived.by(() => groupTasksByStatus(sortedTasks))
  const timelineTasks = $derived(sortedTasks.filter((task) => task.due_date !== null))
  const totalCount = $derived(allTasks.length)
  const filteredCount = $derived(filteredTasks.length)
  const hasActiveFilters = $derived(hasActiveTaskFilters(filters))
  const isOptimisticActive = $derived(optimisticInFlight > 0)

  function beginOptimistic() {
    optimisticInFlight += 1
  }

  function endOptimistic() {
    optimisticInFlight = Math.max(0, optimisticInFlight - 1)

    if (optimisticInFlight === 0 && pendingSync !== null) {
      const nextSyncPayload = pendingSync
      pendingSync = null
      initFromServerData(nextSyncPayload)
    }
  }

  function setScopeProvider(provider: () => TaskScopeSnapshot) {
    getCurrentScope = provider
  }

  function setTaskMutating(taskId: string, mutating: boolean) {
    const next = new Set(mutatingTaskIds)
    if (mutating) {
      next.add(taskId)
    } else {
      next.delete(taskId)
    }
    mutatingTaskIds = next
  }

  function isTaskMutating(taskId: string): boolean {
    return mutatingTaskIds.has(taskId)
  }

  // ─── Actions ────────────────────────────────────────────────
  function initFromServerData(tasks: TTask[]) {
    if (optimisticInFlight > 0) {
      pendingSync = tasks
      return
    }

    const map: Record<string, TTask> = {}
    for (const task of tasks) {
      const hydratedTask = tasksMap[task.id]
      if (task.resolved_brief === undefined && hydratedTask?.resolved_brief !== undefined) {
        map[task.id] = { ...task, resolved_brief: hydratedTask.resolved_brief }
      } else {
        map[task.id] = task
      }
    }
    tasksMap = map
    pendingSync = null
  }

  function upsertTask(task: TTask) {
    tasksMap = { ...tasksMap, [task.id]: task }
  }

  function removeTask(id: string) {
    const nextMap: Record<string, TTask> = {}
    for (const [key, value] of Object.entries(tasksMap)) {
      if (key !== id) {
        nextMap[key] = value
      }
    }
    tasksMap = nextMap
  }

  function getTaskById(id: string): TTask | undefined {
    return Object.prototype.hasOwnProperty.call(tasksMap, id) ? tasksMap[id] : undefined
  }

  function getMutationContext(): TaskMutationContext<TTask> {
    return {
      getTaskById,
      getTasksMap: () => tasksMap,
      setTasksMap: (map) => {
        tasksMap = map
      },
      beginOptimistic,
      endOptimistic,
      setTaskMutating,
      isTaskMutating,
      fetchGroupedTasks,
      normalizeTaskMutationError,
      notificationStore,
      translate,
    }
  }

  async function moveTaskStatus(taskId: string, newStatusId: TaskStatus, newSortOrder?: number) {
    return executeMoveTaskStatus(getMutationContext(), taskId, newStatusId, newSortOrder)
  }

  async function reorderTask(taskId: string, newSortOrder: number) {
    return executeReorderTask(getMutationContext(), taskId, newSortOrder)
  }

  async function batchUpdateStatus(taskIds: string[], newStatusId: TaskStatus) {
    return executeBatchUpdateStatus(getMutationContext(), taskIds, newStatusId)
  }

  async function fetchGroupedTasks() {
    const fetchSeq = ++groupedFetchSeq
    const fetchScope = getCurrentScope?.()
    const params = fetchScope?.projectId ? { project_id: fetchScope.projectId } : undefined

    isLoading = true
    try {
      const response = await axios.get<{ data: Record<string, TTask[]> }>(
        '/api/v1/tasks/status-groups',
        { params }
      )
      if (fetchSeq !== groupedFetchSeq || !sameTaskScope(fetchScope, getCurrentScope?.())) {
        return
      }
      const map: Record<string, TTask> = {}
      for (const tasks of Object.values(response.data.data)) {
        for (const task of tasks) {
          map[task.id] = task
        }
      }
      tasksMap = map
    } finally {
      if (fetchSeq === groupedFetchSeq) {
        isLoading = false
      }
    }
  }

  async function fetchTimelineTasks() {
    isLoading = true
    try {
      const response = await axios.get<{ data: TTask[] }>('/api/v1/tasks/timeline-items')
      const map: Record<string, TTask> = {}
      for (const task of response.data.data) {
        map[task.id] = task
      }
      tasksMap = map
    } finally {
      isLoading = false
    }
  }

  function setLayout(layout: TaskLayout) {
    activeLayout = layout
  }

  function setFilters(newFilters: Partial<TaskFilters>) {
    filters = { ...filters, ...newFilters }
  }

  function clearFilters() {
    filters = defaultTaskFilters()
  }

  function toggleDisplayProperty(key: keyof TaskDisplayProperties) {
    displayProperties = { ...displayProperties, [key]: !displayProperties[key] }
  }

  function setSort(field: TaskSortConfig['field'], order?: TaskSortConfig['order']) {
    if (sortConfig.field === field && !order) {
      sortConfig = { field, order: sortConfig.order === 'asc' ? 'desc' : 'asc' }
    } else {
      sortConfig = { field, order: order ?? 'asc' }
    }
  }

  return {
    get tasksMap() {
      return tasksMap
    },
    get activeLayout() {
      return activeLayout
    },
    get isLoading() {
      return isLoading
    },
    get filters() {
      return filters
    },
    get displayProperties() {
      return displayProperties
    },
    get sortConfig() {
      return sortConfig
    },
    get allTasks() {
      return allTasks
    },
    get filteredTasks() {
      return filteredTasks
    },
    get sortedTasks() {
      return sortedTasks
    },
    get tasksByStatus() {
      return tasksByStatus
    },
    get timelineTasks() {
      return timelineTasks
    },
    get totalCount() {
      return totalCount
    },
    get filteredCount() {
      return filteredCount
    },
    get hasActiveFilters() {
      return hasActiveFilters
    },
    get isOptimisticActive() {
      return isOptimisticActive
    },
    get mutatingTaskIds() {
      return mutatingTaskIds
    },
    get pendingSync() {
      return pendingSync
    },

    initFromServerData,
    upsertTask,
    removeTask,
    getTaskById,
    isTaskMutating,
    setScopeProvider,
    moveTaskStatus,
    reorderTask,
    batchUpdateStatus,
    fetchGroupedTasks,
    fetchTimelineTasks,
    setLayout,
    setFilters,
    clearFilters,
    toggleDisplayProperty,
    setSort,
  }
}
