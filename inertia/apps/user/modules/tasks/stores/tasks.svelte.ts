import axios from 'axios'


import { normalizeTaskMutationError } from '@/apps/user/modules/tasks/lib/errors/task_mutation_errors'
import type {
  TaskDetail,
  TaskStatus,
  TaskPriority,
  TaskLabel,
  TaskDifficulty,
} from '@/apps/user/modules/tasks/types/index.svelte'
import { notificationStore } from '@/apps/user/shared/stores/notification_store.svelte'
import { useTranslation } from '@/apps/user/shared/stores/translation.svelte'

// ============================================================================
// Types
// ============================================================================

export type TaskLayout = 'kanban' | 'list'

export interface TaskFilters {
  search: string
  statuses: TaskStatus[]
  priorities: TaskPriority[]
  labels: TaskLabel[]
  difficulties: TaskDifficulty[]
  assignees: string[]
}

export interface TaskDisplayProperties {
  status: boolean
  priority: boolean
  label: boolean
  assignee: boolean
  dueDate: boolean
  createdAt: boolean
  difficulty: boolean
  estimatedTime: boolean
  progress: boolean
  project: boolean
}

export interface TaskSortConfig {
  field: 'title' | 'due_date' | 'created_at' | 'updated_at' | 'priority' | 'status' | 'sort_order'
  order: 'asc' | 'desc'
}

export interface TaskScopeSnapshot {
  baseRoute: string
  shellMode?: 'app' | 'organization' | 'project'
  projectId?: string | null
}

export interface TaskStoreOptions {
  getCurrentScope?: () => TaskScopeSnapshot
}

// ============================================================================
// Priority ordering for sorting
// ============================================================================

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function isTaskDebugEnabled(): boolean {
  if (import.meta.env.DEV) return true
  if (typeof window === 'undefined') return false

  return window.localStorage.getItem('tasks:kanban:debug') === '1'
}

function debugTaskStore(message: string, payload?: Record<string, unknown>) {
  if (!isTaskDebugEnabled()) return

  console.warn(`[TaskStore] ${message}`, payload ?? {})
}

// ============================================================================
// Store Factory
// ============================================================================

export function createTaskStore(options: TaskStoreOptions = {}) {
  const { t: translate } = useTranslation()

  // ─── Core State ─────────────────────────────────────────────
  let tasksMap = $state<Record<string, TaskDetail>>({})
  let activeLayout = $state<TaskLayout>('kanban')
  let isLoading = $state(false)
  let getCurrentScope = options.getCurrentScope

  let filters = $state<TaskFilters>({
    search: '',
    statuses: [],
    priorities: [],
    labels: [],
    difficulties: [],
    assignees: [],
  })

  let displayProperties = $state<TaskDisplayProperties>({
    status: true,
    priority: true,
    label: true,
    assignee: true,
    dueDate: true,
    createdAt: false,
    difficulty: false,
    estimatedTime: false,
    progress: true,
    project: false,
  })

  let sortConfig = $state<TaskSortConfig>({
    field: 'sort_order',
    order: 'asc',
  })

  // Tracks in-flight optimistic requests for stale-state guards at page level.
  let optimisticInFlight = $state(0)
  let pendingSync = $state<TaskDetail[] | null>(null)
  let groupedFetchSeq = 0
  let mutatingTaskIds = $state<Set<string>>(new Set())

  // ─── Derived State ──────────────────────────────────────────

  /** All tasks as flat array */
  const allTasks = $derived(Object.values(tasksMap))

  /** Filtered tasks based on active filters */
  const filteredTasks = $derived.by(() => {
    let result = allTasks

    // Search filter
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.description?.toLowerCase().includes(q) ?? false) ||
          t.id.includes(q)
      )
    }

    // Status filter
    if (filters.statuses.length > 0) {
      result = result.filter((t) => {
        const effectiveStatus = t.task_status_id ?? t.status
        return Boolean(effectiveStatus && filters.statuses.includes(effectiveStatus))
      })
    }

    // Priority filter
    if (filters.priorities.length > 0) {
      result = result.filter((t) => filters.priorities.includes(t.priority))
    }

    // Label filter
    if (filters.labels.length > 0) {
      result = result.filter((t) => filters.labels.includes(t.label))
    }

    // Difficulty filter
    if (filters.difficulties.length > 0) {
      result = result.filter((t) => t.difficulty && filters.difficulties.includes(t.difficulty))
    }

    // Assignee filter
    if (filters.assignees.length > 0) {
      result = result.filter(
        (t) =>
          (t.assigned_to && filters.assignees.includes(t.assigned_to)) ??
          (t.assignee && filters.assignees.includes(t.assignee.id))
      )
    }

    return result
  })

  /** Sorted tasks */
  const sortedTasks = $derived.by(() => {
    const sorted = [...filteredTasks]
    const { field, order } = sortConfig

    sorted.sort((a, b) => {
      let cmp = 0

      switch (field) {
        case 'title':
          cmp = a.title.localeCompare(b.title)
          break
        case 'due_date':
          cmp = (a.due_date ?? '').localeCompare(b.due_date ?? '')
          break
        case 'created_at':
          cmp = a.created_at.localeCompare(b.created_at)
          break
        case 'updated_at':
          cmp = a.updated_at.localeCompare(b.updated_at)
          break
        case 'priority':
          cmp = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
          break
        case 'status': {
          const aStatus = (a.task_status_id ?? a.status) || ''
          const bStatus = (b.task_status_id ?? b.status) || ''
          cmp = aStatus.localeCompare(bStatus)
          break
        }
        case 'sort_order':
          cmp = (a.sort_order ?? 0) - (b.sort_order ?? 0)
          break
      }

      return order === 'asc' ? cmp : -cmp
    })

    return sorted
  })

  /** Tasks grouped by status (for Kanban) */
  const tasksByStatus = $derived.by(() => {
    const grouped: Partial<Record<string, TaskDetail[]>> = {}

    for (const task of sortedTasks) {
      const statusKey = task.task_status_id ?? task.status
      if (!statusKey) {
        continue
      }
      grouped[statusKey] ??= [];
      grouped[statusKey].push(task)
    }

    return grouped
  })

  /** Tasks with due_date (kept for potential timeline usage) */
  const timelineTasks = $derived(sortedTasks.filter((task) => task.due_date !== null))

  /** Total count */
  const totalCount = $derived(allTasks.length)

  /** Filtered count */
  const filteredCount = $derived(filteredTasks.length)

  /** Check if any filter is active */
  const hasActiveFilters = $derived(
    filters.search !== '' ||
      filters.statuses.length > 0 ||
      filters.priorities.length > 0 ||
      filters.labels.length > 0 ||
      filters.difficulties.length > 0 ||
      filters.assignees.length > 0
  )

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

  function sameScope(left?: TaskScopeSnapshot, right?: TaskScopeSnapshot): boolean {
    return (
      (left?.baseRoute ?? '') === (right?.baseRoute ?? '') &&
      (left?.shellMode ?? 'app') === (right?.shellMode ?? 'app') &&
      (left?.projectId ?? null) === (right?.projectId ?? null)
    )
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

  /** Initialize store from server data */
  function initFromServerData(tasks: TaskDetail[]) {
    if (optimisticInFlight > 0) {
      pendingSync = tasks
      return
    }

    const map: Record<string, TaskDetail> = {}
    for (const task of tasks) {
      const hydratedTask = tasksMap[task.id]
      map[task.id] =
        task.resolved_brief === undefined && hydratedTask?.resolved_brief !== undefined
          ? { ...task, resolved_brief: hydratedTask.resolved_brief }
          : task
    }
    tasksMap = map
    pendingSync = null
  }

  /** Add or update a task */
  function upsertTask(task: TaskDetail) {
    tasksMap = { ...tasksMap, [task.id]: task }
  }

  /** Remove a task */
  function removeTask(id: string) {
    const { [id]: removedTask, ...rest } = tasksMap
    void removedTask
    tasksMap = rest
  }

  function getTaskById(id: string): TaskDetail | undefined {
    return Object.prototype.hasOwnProperty.call(tasksMap, id) ? tasksMap[id] : undefined
  }

  /** Move task to new status (optimistic update for Kanban drag) */
  async function moveTaskStatus(taskId: string, newStatusId: TaskStatus, newSortOrder?: number) {
    const task = getTaskById(taskId)
    if (!task) {
      debugTaskStore('moveTaskStatus ignored: task not found', { taskId, newStatusId })
      return
    }
    if (isTaskMutating(taskId)) {
      debugTaskStore('moveTaskStatus ignored: task mutating', { taskId, newStatusId })
      notificationStore.info(
        translate('task.workflow.board_sync_title', {}, 'Board is syncing'),
        translate('task.workflow.current_operation_wait_message', {}, 'Please wait for the current operation to finish.')
      )
      return
    }

    debugTaskStore('moveTaskStatus started', {
      taskId,
      fromStatus: task.status,
      fromTaskStatusId: task.task_status_id,
      newStatusId,
      newSortOrder,
    })

    beginOptimistic()
    setTaskMutating(taskId, true)

    // Optimistic update
    const prevStatus = task.status
    const prevTaskStatusId = task.task_status_id
    const prevSortOrder = task.sort_order
    tasksMap = {
      ...tasksMap,
      [taskId]: {
        ...task,
        task_status_id: newStatusId,
        sort_order: newSortOrder ?? task.sort_order ?? 0,
      },
    }

    try {
      debugTaskStore('moveTaskStatus patch request', {
        taskId,
        url: `/api/v1/tasks/${taskId}/sort-order`,
        sortOrder: newSortOrder ?? task.sort_order ?? 0,
        taskStatusId: newStatusId,
      })

      const response = await axios.patch<{ data: TaskDetail }>(
        `/api/v1/tasks/${taskId}/sort-order`,
        {
          sortOrder: newSortOrder ?? task.sort_order ?? 0,
          taskStatusId: newStatusId,
        }
      )

      tasksMap = {
        ...tasksMap,
        [taskId]: response.data.data,
      }

      debugTaskStore('moveTaskStatus patch success', {
        taskId,
        responseStatusId: response.data.data.task_status_id,
        responseSortOrder: response.data.data.sort_order,
      })
    } catch (error: unknown) {
      const normalizedError = normalizeTaskMutationError(
        error,
        translate('task.mutation.move_status_fallback', {}, 'Unable to move the task through the current workflow.')
      )

      debugTaskStore('moveTaskStatus patch failed', {
        taskId,
        newStatusId,
        message: normalizedError.message,
        isConflict: normalizedError.isConflict,
        error,
      })

      notificationStore.error(translate('task.mutation.status_update_failed', {}, 'Status update failed'), normalizedError.message)

      // Rollback on failure
      tasksMap = {
        ...tasksMap,
        [taskId]: {
          ...task,
          status: prevStatus,
          task_status_id: prevTaskStatusId,
          sort_order: prevSortOrder,
        },
      }

      if (normalizedError.isConflict) {
        await fetchGroupedTasks()
      }
    } finally {
      setTaskMutating(taskId, false)
      endOptimistic()
      debugTaskStore('moveTaskStatus finished', { taskId, newStatusId })
    }
  }

  /** Reorder task within same column */
  async function reorderTask(taskId: string, newSortOrder: number) {
    const task = getTaskById(taskId)
    if (!task) return
    if (isTaskMutating(taskId)) {
      notificationStore.info(
        translate('task.workflow.board_sync_title', {}, 'Board is syncing'),
        translate('task.workflow.current_operation_wait_message', {}, 'Please wait for the current operation to finish.')
      )
      return
    }

    beginOptimistic()
    setTaskMutating(taskId, true)

    const prevSortOrder = task.sort_order
    tasksMap = {
      ...tasksMap,
      [taskId]: { ...task, sort_order: newSortOrder },
    }

    try {
      await axios.patch(`/api/v1/tasks/${taskId}/sort-order`, {
        sortOrder: newSortOrder,
      })
    } catch (error: unknown) {
      tasksMap = {
        ...tasksMap,
        [taskId]: { ...task, sort_order: prevSortOrder },
      }

      notificationStore.error(
        translate('task.mutation.sort_failed_title', {}, 'Task sorting failed'),
        normalizeTaskMutationError(error, translate('task.mutation.sort_failed_fallback', {}, 'Unable to update task order.')).message
      )

      if (normalizeTaskMutationError(error).isConflict) {
        await fetchGroupedTasks()
      }
    } finally {
      setTaskMutating(taskId, false)
      endOptimistic()
    }
  }

  /** Batch update status */
  async function batchUpdateStatus(taskIds: string[], newStatusId: TaskStatus) {
    beginOptimistic()

    // Optimistic update
    const prevStates: Record<
      string,
      { status: string; task_status_id: string | null | undefined }
    > = {}
    const updated = { ...tasksMap }
    for (const id of taskIds) {
      if (!Object.prototype.hasOwnProperty.call(updated, id)) continue

      const currentTask = updated[id]
      if (!currentTask) continue

      prevStates[id] = {
        status: currentTask.status,
        task_status_id: currentTask.task_status_id,
      }
      updated[id] = { ...currentTask, task_status_id: newStatusId }
    }
    tasksMap = updated

    try {
      await axios.patch('/api/v1/tasks/batch-status', {
        taskIds,
        taskStatusId: newStatusId,
      })
    } catch (error: unknown) {
      // Rollback
      const rollback = { ...tasksMap }
      for (const [id, previous] of Object.entries(prevStates)) {
        if (!Object.prototype.hasOwnProperty.call(rollback, id)) continue

        const currentTask = rollback[id]
        if (!currentTask) continue

        rollback[id] = {
          ...currentTask,
          status: previous.status,
          task_status_id: previous.task_status_id,
        }
      }
      tasksMap = rollback

      notificationStore.error(
        translate('task.mutation.batch_failed_title', {}, 'Batch update failed'),
        normalizeTaskMutationError(
          error,
          translate('task.mutation.batch_failed_fallback', {}, 'Unable to update status for the selected tasks.')
        ).message
      )

      if (normalizeTaskMutationError(error).isConflict) {
        await fetchGroupedTasks()
      }
    } finally {
      endOptimistic()
    }
  }

  /** Fetch grouped tasks from server */
  async function fetchGroupedTasks() {
    const fetchSeq = ++groupedFetchSeq
    const fetchScope = getCurrentScope?.()
    const params = fetchScope?.projectId ? { project_id: fetchScope.projectId } : undefined

    isLoading = true
    try {
      const response = await axios.get<{ data: Record<string, TaskDetail[]> }>(
        '/api/v1/tasks/status-groups',
        { params }
      )
      if (fetchSeq !== groupedFetchSeq || !sameScope(fetchScope, getCurrentScope?.())) {
        return
      }
      const map: Record<string, TaskDetail> = {}
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

  /** Fetch timeline tasks from server */
  async function fetchTimelineTasks() {
    isLoading = true
    try {
      const response = await axios.get<{ data: TaskDetail[] }>('/api/v1/tasks/timeline-items')
      const map: Record<string, TaskDetail> = {}
      for (const task of response.data.data) {
        map[task.id] = task
      }
      tasksMap = map
    } finally {
      isLoading = false
    }
  }

  /** Set active layout */
  function setLayout(layout: TaskLayout) {
    activeLayout = layout
  }

  /** Update filters */
  function setFilters(newFilters: Partial<TaskFilters>) {
    filters = { ...filters, ...newFilters }
  }

  /** Clear all filters */
  function clearFilters() {
    filters = {
      search: '',
      statuses: [],
      priorities: [],
      labels: [],
      difficulties: [],
      assignees: [],
    }
  }

  /** Toggle a display property */
  function toggleDisplayProperty(key: keyof TaskDisplayProperties) {
    displayProperties = { ...displayProperties, [key]: !displayProperties[key] }
  }

  /** Set sort config */
  function setSort(field: TaskSortConfig['field'], order?: TaskSortConfig['order']) {
    if (sortConfig.field === field && !order) {
      // Toggle order
      sortConfig = { field, order: sortConfig.order === 'asc' ? 'desc' : 'asc' }
    } else {
      sortConfig = { field, order: order ?? 'asc' }
    }
  }

  // ─── Return Public API ──────────────────────────────────────

  return {
    // State (readonly getters)
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

    // Derived
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

    // Actions
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

/** Singleton task store type */
export type TaskStore = ReturnType<typeof createTaskStore>
