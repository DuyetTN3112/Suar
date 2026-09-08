import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import KanbanBoard from '@/apps/user/modules/tasks/components/views/kanban/kanban_board.svelte'
import type { TaskStore } from '@/apps/user/modules/tasks/stores/tasks.svelte'

function makeStore(): TaskStore {
  return {
    isLoading: false,
    isOptimisticActive: false,
    totalCount: 1,
    filteredCount: 1,
    sortedTasks: [],
    tasksByStatus: {
      todo: [],
      done: [],
    },
    displayProperties: {
      priority: true,
      label: true,
      assignee: true,
      dueDate: true,
    },
    clearFilters: vi.fn(),
    moveTaskStatus: vi.fn(),
    isTaskMutating: vi.fn(() => false),
  } as unknown as TaskStore
}

function makeDataTransfer() {
  const data = new Map<string, string>()

  return {
    effectAllowed: '',
    dropEffect: '',
    types: [] as string[],
    setData(type: string, value: string) {
      data.set(type, value)
      this.types = [...data.keys()]
    },
    getData(type: string) {
      return data.get(type) ?? ''
    },
  }
}

describe('Kanban status management', () => {
  it('persists a status column moved before another column', async () => {
    const onReorderStatuses = vi.fn()
    const dataTransfer = makeDataTransfer()

    render(KanbanBoard, {
      props: {
        store: makeStore(),
        metadata: {
          statuses: [
            { value: 'todo-id', label: 'Todo', color: '#64748B' },
            { value: 'in-progress-id', label: 'In progress', color: '#2563EB' },
          ],
          labels: [],
          priorities: [],
          users: [],
        },
        canManageStatuses: true,
        canCreateTask: true,
        canDeleteStatus: () => true,
        onReorderStatuses,
      },
    })

    const dragHandles = screen.getAllByRole('button', {
      name: 'Kéo để đổi vị trí cột trạng thái',
    })
    const todoColumn = screen.getByRole('region', { name: 'Cột Todo' })

    await fireEvent.dragStart(dragHandles[1] as Element, { dataTransfer })
    await fireEvent.drop(todoColumn, { dataTransfer })

    expect(onReorderStatuses).toHaveBeenCalledWith({
      orderedStatusIds: ['in-progress-id', 'todo-id'],
      previousStatusIds: ['todo-id', 'in-progress-id'],
    })
  })

  it('keeps a task visible while a pre-migration status ID is replaced by the project workflow', () => {
    const task = {
      id: 'task-from-cached-board',
      title: 'Recovered after workflow migration',
      description: 'desc',
      status: 'in_progress',
      task_status_id: 'legacy-status-id',
      label: 'feature' as const,
      priority: 'medium' as const,
      creator_id: 'creator-1',
      due_date: null,
      created_at: '2026-07-09T00:00:00.000Z',
      updated_at: '2026-07-09T00:00:00.000Z',
      organization_id: 'org-1',
      project_id: 'project-1',
    }
    const store = {
      ...makeStore(),
      tasksByStatus: {},
      sortedTasks: [task],
      totalCount: 1,
      filteredCount: 1,
      getTaskById: vi.fn(),
    }

    render(KanbanBoard, {
      props: {
        store,
        metadata: {
          statuses: [
            {
              value: 'project-in-progress-id',
              label: 'In progress',
              slug: 'in_progress',
              category: 'in_progress',
            },
          ],
          labels: [],
          priorities: [],
          users: [],
        },
        canManageStatuses: false,
        canCreateTask: false,
        canDeleteStatus: () => false,
      },
    })

    expect(screen.getByRole('button', { name: /Recovered after workflow migration/ })).toBeInTheDocument()
  })

  it('moves a task to Done without requiring a submission', async () => {
    const task = {
      id: 'task-1',
      title: 'Needs submission',
      description: 'desc',
      status: 'todo',
      task_status_id: 'todo',
      label: 'feature' as const,
      priority: 'medium' as const,
      creator_id: 'creator-1',
      due_date: null,
      created_at: '2026-07-09T00:00:00.000Z',
      updated_at: '2026-07-09T00:00:00.000Z',
      organization_id: 'org-1',
      project_id: 'project-1',
      task_type: 'feature_work',
      review_zone: {
        submission_id: null,
        submission_status: 'draft',
        review_session_id: null,
        review_session_status: null,
        dispute_id: null,
        dispute_status: null,
        creator_review_completed: null,
        manager_reviews_count: 0,
        peer_reviews_count: 0,
        required_total_reviews: null,
        required_peer_reviews: null,
        required_pending_assignments: 0,
        optional_pending_assignments: 0,
      },
    }

    const store = {
      ...makeStore(),
      tasksByStatus: {
        todo: [task],
        done: [],
      },
      sortedTasks: [task],
      getTaskById: (taskId: string) => (taskId === task.id ? task : undefined),
    }

    render(KanbanBoard, {
      props: {
        store,
        metadata: {
          statuses: [
            {
              value: 'todo',
              label: 'To do',
              category: 'todo',
            },
            {
              value: 'done',
              label: 'Done',
              category: 'done',
            },
          ],
          labels: [],
          priorities: [],
          users: [],
        },
        canManageStatuses: false,
        canCreateTask: false,
        canDeleteStatus: () => false,
        onTaskClick: vi.fn(),
      },
    })

    const card = screen.getByRole('button', { name: /Needs submission/ })
    const doneColumn = screen.getByRole('region', { name: 'Cột Done' })
    const dataTransfer = makeDataTransfer()

    await fireEvent.dragStart(card, { dataTransfer })
    await fireEvent.drop(doneColumn, { dataTransfer })

    expect(screen.queryByText(/Hãy nộp bài/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Nộp bài/i })).not.toBeInTheDocument()
    expect(store.moveTaskStatus).toHaveBeenCalledWith(task.id, 'done', expect.any(Number))
  })

  it('keeps a Docs item in its permanent board column', async () => {
    const task = {
      id: 'docs-item-1',
      title: 'Quy ước triển khai',
      description: 'https://example.test/docs/deployment',
      status: 'todo',
      task_status_id: 'docs',
      label: 'documentation' as const,
      priority: 'medium' as const,
      creator_id: 'creator-1',
      due_date: null,
      created_at: '2026-08-13T00:00:00.000Z',
      updated_at: '2026-08-13T00:00:00.000Z',
      organization_id: 'org-1',
      project_id: 'project-1',
    }
    const store = {
      ...makeStore(),
      tasksByStatus: { docs: [task], todo: [] },
      sortedTasks: [task],
      getTaskById: (taskId: string) => (taskId === task.id ? task : undefined),
    }

    render(KanbanBoard, {
      props: {
        store,
        metadata: {
          statuses: [
            { value: 'docs', label: 'Docs', slug: 'docs', category: 'todo' },
            { value: 'todo', label: 'To do', slug: 'todo', category: 'todo' },
          ],
          labels: [],
          priorities: [],
          users: [],
        },
        canCreateTask: true,
      },
    })

    const card = screen.getByRole('button', { name: /Quy ước triển khai/ })
    const todoColumn = screen.getByRole('region', { name: 'Cột To do' })
    const dataTransfer = makeDataTransfer()

    await fireEvent.dragStart(card, { dataTransfer })
    await fireEvent.drop(todoColumn, { dataTransfer })

    expect(store.moveTaskStatus).not.toHaveBeenCalled()
  })
})
