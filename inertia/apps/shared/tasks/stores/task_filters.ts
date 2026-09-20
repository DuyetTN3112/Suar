import type {
  TaskPriority,
  TaskLabel,
  TaskDifficulty,
} from '@/apps/user/modules/tasks/types/index.svelte'

import type {
  TaskFilters,
  TaskDisplayProperties,
  TaskSortConfig,
  TaskScopeSnapshot,
} from '../task_store_types'

export interface TaskFilterableItem {
  id: string
  title: string
  description?: string | null
  status?: string
  task_status_id?: string | null
  priority: TaskPriority
  label: TaskLabel
  difficulty?: TaskDifficulty | null
  assigned_to?: string | null
  assignee?: { id: string } | null
  sort_order?: number | null
  due_date?: string | null
  created_at: string
  updated_at: string
}

export const PRIORITY_ORDER: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

export function defaultTaskFilters(): TaskFilters {
  return {
    search: '',
    statuses: [],
    priorities: [],
    labels: [],
    difficulties: [],
    assignees: [],
  }
}

export function defaultDisplayProperties(): TaskDisplayProperties {
  return {
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
  }
}

export function defaultSortConfig(): TaskSortConfig {
  return {
    field: 'sort_order',
    order: 'asc',
  }
}

export function hasActiveTaskFilters(filters: TaskFilters): boolean {
  return (
    filters.search !== '' ||
    filters.statuses.length > 0 ||
    filters.priorities.length > 0 ||
    filters.labels.length > 0 ||
    filters.difficulties.length > 0 ||
    filters.assignees.length > 0
  )
}

export function sameTaskScope(left?: TaskScopeSnapshot, right?: TaskScopeSnapshot): boolean {
  return (
    (left?.baseRoute ?? '') === (right?.baseRoute ?? '') &&
    (left?.shellMode ?? 'app') === (right?.shellMode ?? 'app') &&
    (left?.projectId ?? null) === (right?.projectId ?? null)
  )
}

export function filterTasks<T extends TaskFilterableItem>(tasks: T[], filters: TaskFilters): T[] {
  let result = tasks

  if (filters.search) {
    const q = filters.search.toLowerCase()
    result = result.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false) ||
        t.id.includes(q)
    )
  }

  if (filters.statuses.length > 0) {
    result = result.filter((t) => {
      const effectiveStatus = (t.task_status_id ?? t.status)
      return Boolean(effectiveStatus && filters.statuses.includes(effectiveStatus))
    })
  }

  if (filters.priorities.length > 0) {
    result = result.filter((t) => filters.priorities.includes(t.priority))
  }

  if (filters.labels.length > 0) {
    result = result.filter((t) => filters.labels.includes(t.label))
  }

  if (filters.difficulties.length > 0) {
    result = result.filter((t) => t.difficulty && filters.difficulties.includes(t.difficulty))
  }

  if (filters.assignees.length > 0) {
    result = result.filter(
      (t) =>
        (t.assigned_to && filters.assignees.includes(t.assigned_to)) ??
        (t.assignee && filters.assignees.includes(t.assignee.id))
    )
  }

  return result
}

export function sortTasks<T extends TaskFilterableItem>(tasks: T[], config: TaskSortConfig): T[] {
  const sorted = [...tasks]
  const { field, order } = config

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
}

export function groupTasksByStatus<T extends TaskFilterableItem>(tasks: T[]): Partial<Record<string, T[]>> {
  const grouped: Partial<Record<string, T[]>> = {}

  for (const task of tasks) {
    const statusKey = task.task_status_id ?? task.status
    if (!statusKey) {
      continue
    }
    const bucket = grouped[statusKey] ?? []
    bucket.push(task)
    grouped[statusKey] = bucket
  }

  return grouped
}
