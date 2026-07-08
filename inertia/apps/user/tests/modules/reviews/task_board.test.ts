/* eslint-disable import-x/order */
import { fireEvent, render, screen } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import LayoutStub from '../../shared/test_stubs/layout_stub.svelte'

const inertiaMocks = vi.hoisted(() => ({
  router: {
    get: vi.fn(),
  },
}))

vi.mock('@/apps/user/shared/layouts/app_layout.svelte', () => ({
  default: LayoutStub,
}))

vi.mock('@inertiajs/svelte', () => ({
  page: {
    props: {
      auth: {
        user: {
          id: 'reviewer-1',
        },
      },
    },
  },
  router: inertiaMocks.router,
}))

import TaskBoardPage from '@/apps/user/modules/reviews/task-board.svelte'

type WorkflowStatus =
  | 'awaiting_review'
  | 'in_review'
  | 'awaiting_response'
  | 'disputed'
  | 'reported'
  | 'done'

const boardProps = {
  projectId: 'project-1',
  selectedTaskId: null,
  detail: null,
  board: {
    projectId: 'project-1',
    columns: [
      {
        status: 'awaiting_review' as WorkflowStatus,
        label: 'Chờ review',
        cards: [
          {
            taskId: 'task-1',
            workflowId: null,
            status: 'awaiting_review' as WorkflowStatus,
            title: 'Review delivered payment task',
            description: null,
            taskStatus: 'done',
            priority: 'medium',
            label: 'feature',
            difficulty: 'medium',
            dueDate: null,
            estimatedTime: null,
            revieweeId: 'worker-1',
            revieweeName: 'worker',
            creatorId: 'creator-1',
            creatorName: 'creator',
            projectId: 'project-1',
            reviewCount: 0,
            requiredReviewCount: 2,
            lastActivityAt: null,
          },
        ],
      },
    ],
  },
}

describe('User task review board', () => {
  beforeEach(() => {
    inertiaMocks.router.get.mockClear()
  })

  it('opens selected task on the task detail surface', async () => {
    render(TaskBoardPage, {
      props: boardProps,
    })

    await fireEvent.click(screen.getByRole('button', { name: /Review delivered payment task/i }))

    expect(inertiaMocks.router.get).toHaveBeenCalledWith('/tasks/task-1')
  })

  it('does not render inline task review detail on the board', () => {
    render(TaskBoardPage, {
      props: {
        ...boardProps,
        selectedTaskId: 'task-1',
        detail: {
          task: {
            id: 'task-1',
            title: 'Review delivered payment task',
            assigned_to: 'worker-1',
          },
          workflow: null,
          reviewers: [],
          comments: [],
          reviewMessages: [],
        },
      },
    })

    expect(screen.queryByRole('heading', { name: 'Task detail' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Nhập review')).not.toBeInTheDocument()
  })
})
