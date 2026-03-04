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
  it('refuses done moves without submission and offers Submit work', async () => {
    const onTaskClick = vi.fn()
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

    render(KanbanBoard, {
      props: {
        store: {
          ...makeStore(),
          tasksByStatus: {
            todo: [task],
            done: [],
          },
          sortedTasks: [task],
          getTaskById: (taskId: string) => (taskId === task.id ? task : undefined),
        },
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
        onTaskClick,
      },
    })

    const card = screen.getByRole('button', { name: /Needs submission/ })
    const doneColumn = screen.getByRole('region', { name: 'Cột Done' })
    const dataTransfer = makeDataTransfer()

    await fireEvent.dragStart(card, { dataTransfer })
    await fireEvent.drop(doneColumn, { dataTransfer })

    expect(screen.getByRole('status')).toHaveTextContent(/Hãy nộp bài/i)
    expect(screen.getByRole('button', { name: /Nộp bài/i })).toBeInTheDocument()
    await fireEvent.click(screen.getByRole('button', { name: /Nộp bài/i }))
    expect(onTaskClick).toHaveBeenCalledWith(task)
  })
})
