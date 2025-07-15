import axios from 'axios'

import { notificationStore } from '@/stores/notification_store.svelte'

import type {
  Task,
  TaskStatus,
  TaskPriority,
  TaskLabel,
  TaskDifficulty,
} from '../pages/tasks/types.svelte'

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

// ============================================================================
// Priority ordering for sorting
// ============================================================================

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

// ============================================================================
// Store Factory
// ============================================================================

export function createTaskStore() {
  // ─── Core State ─────────────────────────────────────────────
  let tasksMap = $state<Record<string, Task>>({})
  let activeLayout = $state<TaskLayout>('list')
  let isLoading = $state(false)

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
  let pendingSync = $state<Task[] | null>(null)

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
    const grouped: Partial<Record<string, Task[]>> = {}

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

  function parseErrorMessage(error: unknown, fallback: string): string {
    return (
      (error as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback
    )
  }

  function isConflictError(error: unknown): boolean {
    return (error as { response?: { status?: number } }).response?.status === 409
  }

  // ─── Actions ────────────────────────────────────────────────

  /** Initialize store from server data */
  function initFromServerData(tasks: Task[]) {
    if (optimisticInFlight > 0) {
      pendingSync = tasks
      return
    }

    const map: Record<string, Task> = {}
    for (const task of tasks) {
      map[task.id] = task
    }
    tasksMap = map
    pendingSync = null
  }

  /** Add or update a task */
  function upsertTask(task: Task) {
    tasksMap = { ...tasksMap, [task.id]: task }
  }

  /** Remove a task */
  function removeTask(id: string) {
    const { [id]: removedTask, ...rest } = tasksMap
    void removedTask
    tasksMap = rest
  }

  function getTaskById(id: string): Task | undefined {
    return Object.prototype.hasOwnProperty.call(tasksMap, id) ? tasksMap[id] : undefined
  }

  /** Move task to new status (optimistic update for Kanban drag) */
  async function moveTaskStatus(taskId: string, newStatusId: TaskStatus, newSortOrder?: number) {
    const task = getTaskById(taskId)
    if (!task) return

    beginOptimistic()

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
      const response = await axios.patch<{ success: boolean; data: Task }>(
        `/api/tasks/${taskId}/sort-order`,
        {
          sort_order: newSortOrder ?? task.sort_order ?? 0,
          task_status_id: newStatusId,
        }
      )

      tasksMap = {
        ...tasksMap,
        [taskId]: response.data.data,
      }
    } catch (error: unknown) {
      const message = parseErrorMessage(
        error,
        'Không thể chuyển trạng thái task theo workflow hiện tại.'
      )

      notificationStore.error('Cập nhật trạng thái thất bại', message)

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

      if (isConflictError(error)) {
        await fetchGroupedTasks()
      }
    } finally {
      endOptimistic()
    }
  }

  /** Reorder task within same column */
  async function reorderTask(taskId: string, newSortOrder: number) {
    const task = getTaskById(taskId)
    if (!task) return

    beginOptimistic()

    const prevSortOrder = task.sort_order
    tasksMap = {
      ...tasksMap,
      [taskId]: { ...task, sort_order: newSortOrder },
    }

    try {
      await axios.patch(`/api/tasks/${taskId}/sort-order`, {
        sort_order: newSortOrder,
      })
    } catch (error: unknown) {
      tasksMap = {
        ...tasksMap,
        [taskId]: { ...task, sort_order: prevSortOrder },
      }

      notificationStore.error(
        'Sắp xếp task thất bại',
        parseErrorMessage(error, 'Không thể cập nhật thứ tự task.')
      )

      if (isConflictError(error)) {
        await fetchGroupedTasks()
      }
    } finally {
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
      prevStates[id] = {
        status: currentTask.status,
        task_status_id: currentTask.task_status_id,
      }
      updated[id] = { ...currentTask, task_status_id: newStatusId }
    }
    tasksMap = updated

    try {
      await axios.patch('/api/tasks/batch-status', {
        task_ids: taskIds,
        task_status_id: newStatusId,
      })
    } catch (error: unknown) {
      // Rollback
      const rollback = { ...tasksMap }
      for (const [id, previous] of Object.entries(prevStates)) {
        if (!Object.prototype.hasOwnProperty.call(rollback, id)) continue

        const currentTask = rollback[id]
        rollback[id] = {
          ...currentTask,
          status: previous.status,
          task_status_id: previous.task_status_id,
        }
      }
      tasksMap = rollback

      notificationStore.error(
        'Cập nhật hàng loạt thất bại',
        parseErrorMessage(error, 'Không thể cập nhật trạng thái cho danh sách task đã chọn.')
      )

      if (isConflictError(error)) {
        await fetchGroupedTasks()
      }
    } finally {
      endOptimistic()
    }
  }

  /** Fetch grouped tasks from server */
  async function fetchGroupedTasks() {
    isLoading = true
    try {
      const response = await axios.get<{ success: boolean; data: Record<string, Task[]> }>(
        '/api/tasks/grouped'
      )
      if (response.data.success) {
        const map: Record<string, Task> = {}
        for (const tasks of Object.values(response.data.data)) {
          for (const task of tasks) {
            map[task.id] = task
          }
        }
        tasksMap = map
      }
    } finally {
      isLoading = false
    }
  }

  /** Fetch timeline tasks from server */
  async function fetchTimelineTasks() {
    isLoading = true
    try {
      const response = await axios.get<{ success: boolean; data: Task[] }>('/api/tasks/timeline')
      if (response.data.success) {
        const map: Record<string, Task> = {}
        for (const task of response.data.data) {
          map[task.id] = task
        }
        tasksMap = map
      }
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
    get pendingSync() {
      return pendingSync
    },

    // Actions
    initFromServerData,
    upsertTask,
    removeTask,
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
