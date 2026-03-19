import axios from 'axios'
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
// Priority/Status ordering for sorting
// ============================================================================

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

const STATUS_ORDER: Record<string, number> = {
  todo: 0,
  in_progress: 1,
  in_review: 2,
  done: 3,
  cancelled: 4,
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
          t.description?.toLowerCase().includes(q) ||
          t.id.includes(q)
      )
    }

    // Status filter
    if (filters.statuses.length > 0) {
      result = result.filter((t) => filters.statuses.includes(t.status))
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
          (t.assigned_to && filters.assignees.includes(t.assigned_to)) ||
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
        case 'status':
          cmp = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99)
          break
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
    const grouped: Record<string, Task[]> = {
      todo: [],
      in_progress: [],
      in_review: [],
      done: [],
      cancelled: [],
    }

    for (const task of sortedTasks) {
      const status = task.status as string
      if (!grouped[status]) {
        grouped[status] = []
      }
      grouped[status].push(task)
    }

    return grouped
  })

  /** Tasks with due_date (kept for potential timeline usage) */
  const timelineTasks = $derived(sortedTasks.filter((t) => t.due_date != null))

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

  // ─── Actions ────────────────────────────────────────────────

  /** Initialize store from server data */
  function initFromServerData(tasks: Task[]) {
    const map: Record<string, Task> = {}
    for (const task of tasks) {
      map[task.id] = task
    }
    tasksMap = map
  }

  /** Add or update a task */
  function upsertTask(task: Task) {
    tasksMap = { ...tasksMap, [task.id]: task }
  }

  /** Remove a task */
  function removeTask(id: string) {
    const { [id]: _, ...rest } = tasksMap
    tasksMap = rest
  }

  /** Move task to new status (optimistic update for Kanban drag) */
  async function moveTaskStatus(taskId: string, newStatus: TaskStatus, newSortOrder?: number) {
    const task = tasksMap[taskId]
    if (!task) return

    // Optimistic update
    const prevStatus = task.status
    const prevSortOrder = task.sort_order
    tasksMap = {
      ...tasksMap,
      [taskId]: { ...task, status: newStatus, sort_order: newSortOrder ?? task.sort_order ?? 0 },
    }

    try {
      await axios.patch(`/api/tasks/${taskId}/sort-order`, {
        sort_order: newSortOrder ?? task.sort_order ?? 0,
        status: newStatus,
      })
    } catch {
      // Rollback on failure
      tasksMap = {
        ...tasksMap,
        [taskId]: { ...task, status: prevStatus, sort_order: prevSortOrder },
      }
    }
  }

  /** Reorder task within same column */
  async function reorderTask(taskId: string, newSortOrder: number) {
    const task = tasksMap[taskId]
    if (!task) return

    const prevSortOrder = task.sort_order
    tasksMap = {
      ...tasksMap,
      [taskId]: { ...task, sort_order: newSortOrder },
    }

    try {
      await axios.patch(`/api/tasks/${taskId}/sort-order`, {
        sort_order: newSortOrder,
      })
    } catch {
      tasksMap = {
        ...tasksMap,
        [taskId]: { ...task, sort_order: prevSortOrder },
      }
    }
  }

  /** Batch update status */
  async function batchUpdateStatus(taskIds: string[], newStatus: TaskStatus) {
    // Optimistic update
    const prevStates: Record<string, TaskStatus> = {}
    const updated = { ...tasksMap }
    for (const id of taskIds) {
      if (updated[id]) {
        prevStates[id] = updated[id].status
        updated[id] = { ...updated[id], status: newStatus }
      }
    }
    tasksMap = updated

    try {
      await axios.patch('/api/tasks/batch-status', {
        task_ids: taskIds,
        status: newStatus,
      })
    } catch {
      // Rollback
      const rollback = { ...tasksMap }
      for (const [id, status] of Object.entries(prevStates)) {
        if (rollback[id]) {
          rollback[id] = { ...rollback[id], status }
        }
      }
      tasksMap = rollback
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
