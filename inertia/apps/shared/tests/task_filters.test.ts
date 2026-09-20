import { describe, it, expect } from 'vitest'

import {
  defaultTaskFilters,
  defaultDisplayProperties,
  defaultSortConfig,
  filterTasks,
  sortTasks,
  groupTasksByStatus,
  hasActiveTaskFilters,
  sameTaskScope,
  type TaskFilterableItem,
} from '@/apps/shared/tasks/stores/task_filters'

const mockTasks: TaskFilterableItem[] = [
  {
    id: 't-1',
    title: 'Fix auth bug',
    description: 'Login with OAuth fails on redirect',
    status: 'in_progress',
    task_status_id: 'in_progress',
    priority: 'urgent',
    label: 'bug',
    difficulty: 'hard',
    assigned_to: 'user-1',
    sort_order: 2,
    due_date: '2026-09-20',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-02T00:00:00Z',
  },
  {
    id: 't-2',
    title: 'Design landing page',
    description: 'Hero banner and CTA components',
    status: 'todo',
    task_status_id: 'todo',
    priority: 'medium',
    label: 'feature',
    difficulty: 'medium',
    assigned_to: 'user-2',
    sort_order: 1,
    due_date: '2026-09-25',
    created_at: '2026-09-03T00:00:00Z',
    updated_at: '2026-09-04T00:00:00Z',
  },
  {
    id: 't-3',
    title: 'Deploy microservice',
    description: null,
    status: 'done',
    task_status_id: 'done',
    priority: 'low',
    label: 'enhancement',
    difficulty: 'easy',
    assigned_to: null,
    sort_order: 0,
    due_date: null,
    created_at: '2026-09-05T00:00:00Z',
    updated_at: '2026-09-05T00:00:00Z',
  },
]

describe('Task Filters Core', () => {
  it('returns sensible defaults', () => {
    const filters = defaultTaskFilters()
    expect(filters.search).toBe('')
    expect(filters.statuses).toEqual([])
    expect(hasActiveTaskFilters(filters)).toBe(false)

    const displayProps = defaultDisplayProperties()
    expect(displayProps.status).toBe(true)
    expect(displayProps.createdAt).toBe(false)

    const sortConfig = defaultSortConfig()
    expect(sortConfig.field).toBe('sort_order')
    expect(sortConfig.order).toBe('asc')
  })

  it('filters by search keyword', () => {
    const filters = { ...defaultTaskFilters(), search: 'auth' }
    const filtered = filterTasks(mockTasks, filters)
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.id).toBe('t-1')
  })

  it('filters by status', () => {
    const filters = { ...defaultTaskFilters(), statuses: ['todo' as const] }
    const filtered = filterTasks(mockTasks, filters)
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.id).toBe('t-2')
  })

  it('sorts by priority correctly', () => {
    const sorted = sortTasks(mockTasks, { field: 'priority', order: 'asc' })
    expect(sorted.map((t) => t.id)).toEqual(['t-1', 't-2', 't-3'])
  })

  it('sorts by sort_order ascending and descending', () => {
    const asc = sortTasks(mockTasks, { field: 'sort_order', order: 'asc' })
    expect(asc.map((t) => t.id)).toEqual(['t-3', 't-2', 't-1'])

    const desc = sortTasks(mockTasks, { field: 'sort_order', order: 'desc' })
    expect(desc.map((t) => t.id)).toEqual(['t-1', 't-2', 't-3'])
  })

  it('groups tasks by status', () => {
    const grouped = groupTasksByStatus(mockTasks)
    expect(grouped.in_progress).toHaveLength(1)
    expect(grouped.todo).toHaveLength(1)
    expect(grouped.done).toHaveLength(1)
  })

  it('evaluates scope equivalence accurately', () => {
    expect(sameTaskScope(
      { baseRoute: '/org/projects/1', shellMode: 'project', projectId: '1' },
      { baseRoute: '/org/projects/1', shellMode: 'project', projectId: '1' }
    )).toBe(true)

    expect(sameTaskScope(
      { baseRoute: '/org/projects/1', shellMode: 'project', projectId: '1' },
      { baseRoute: '/org/projects/2', shellMode: 'project', projectId: '2' }
    )).toBe(false)
  })
})
