import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/apps/user/shared/stores/translation.svelte', () => ({
  useTranslation: () => ({
    t: (_key: string, _params: Record<string, unknown>, fallback: string) => fallback,
  }),
}))

vi.mock('@/apps/user/shared/lib/date_locale', () => ({
  currentDocumentLocale: () => 'en',
}))

import KanbanBoard from '@/apps/user/modules/tasks/components/views/kanban/kanban_board.svelte'
import type { TaskStore } from '@/apps/user/modules/tasks/stores/tasks.svelte'
import type { TaskDetail } from '@/apps/user/modules/tasks/types/index.svelte'

class TestDataTransfer {
  private readonly data = new Map<string, string>()
  types: string[] = []

  setData(type: string, value: string) {
    this.data.set(type, value)
    if (!this.types.includes(type)) {
      this.types.push(type)
    }
  }

  getData(type: string) {
    return this.data.get(type) ?? ''
  }

  effectAllowed = 'move'
  dropEffect = 'move'
}

const baseTask: TaskDetail = {
  id: 'task-1',
  title: 'Blocked done move',
  description: 'Needs a submission first',
  status: 'in_progress',
  task_status_id: 'in_progress',
  label: 'feature',
  priority: 'medium',
  creator_id: 'creator-1',
  assigned_to: 'assignee-1',
  assignee: {
    id: 'assignee-1',
    username: 'Nora',
    email: 'nora@example.test',
  },
  due_date: null,
  created_at: '2026-07-26T00:00:00.000Z',
  updated_at: '2026-07-26T00:00:00.000Z',
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

function buildStore(task: TaskDetail, moveTaskStatus = vi.fn()): TaskStore {
  return {
    isLoading: false,
    isOptimisticActive: false,
    totalCount: 1,
    filteredCount: 1,
    displayProperties: {
      status: true,
      priority: true,
      label: true,
      assignee: true,
      dueDate: false,
      createdAt: false,
      difficulty: false,
      estimatedTime: false,
      progress: false,
      project: false,
    },
    tasksByStatus: {
      in_progress: [task],
      done: [],
    },
    sortedTasks: [task],
    getTaskById: (id: string) => (id === task.id ? task : undefined),
    isTaskMutating: () => false,
    clearFilters: vi.fn(),
    moveTaskStatus,
  } as unknown as TaskStore
}

describe('KanbanBoard done transition', () => {
  it('moves a done-category task without a submission or submission CTA', async () => {
    const moveTaskStatus = vi.fn()
    render(KanbanBoard, {
      props: {
        store: buildStore(baseTask, moveTaskStatus),
        metadata: {
          statuses: [
            { value: 'in_progress', label: 'In progress', category: 'in_progress' },
            { value: 'done', label: 'Done', category: 'done' },
          ],
          labels: [{ value: 'feature', label: 'Feature' }],
          priorities: [{ value: 'medium', label: 'Medium' }],
          users: [],
        },
        canCreateTask: true,
        hasProjectOptions: true,
      },
    })

    const dataTransfer = new TestDataTransfer()
    const card = screen.getByRole('button', { name: /blocked done move/i })
    await fireEvent.dragStart(card, { dataTransfer })
    const doneColumn = screen.getByText('Done').closest('section')
    expect(doneColumn).not.toBeNull()
    await fireEvent.drop(doneColumn as HTMLElement, { dataTransfer })

    expect(moveTaskStatus).toHaveBeenCalledWith(baseTask.id, 'done', expect.any(Number))
    expect(screen.queryByText(/submit work before moving/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /submit work/i })).not.toBeInTheDocument()
  })
})
