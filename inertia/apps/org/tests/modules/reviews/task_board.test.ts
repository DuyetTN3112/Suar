/* eslint-disable import-x/order */
import { fireEvent, render, screen } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import LayoutStub from '../../shared/test_stubs/layout_stub.svelte'

const inertiaMocks = vi.hoisted(() => ({
  router: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

vi.mock('@/apps/org/shared/layouts/organization_layout.svelte', () => ({
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

import TaskBoardPage from '@/apps/org/modules/reviews/task-board.svelte'

describe('Org task review board', () => {
  beforeEach(() => {
    inertiaMocks.router.get.mockClear()
    inertiaMocks.router.post.mockClear()
  })

  it('opens selected task on the organization task detail surface', async () => {
    render(TaskBoardPage, {
      props: {
        projectId: 'project-1',
        selectedTaskId: null,
        detail: null,
        board: {
          projectId: 'project-1',
          columns: [
            {
              status: 'awaiting_review',
              label: 'Chờ review',
              cards: [
                {
                  taskId: 'task-1',
                  workflowId: null,
                  status: 'awaiting_review',
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
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: /Review delivered payment task/i }))

    expect(inertiaMocks.router.get).toHaveBeenCalledWith('/org/tasks/task-1')
  })

  it('does not render inline task review detail on the board', () => {
    render(TaskBoardPage, {
      props: {
        projectId: 'project-1',
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
        board: {
          projectId: 'project-1',
          columns: [],
        },
      },
    })

    expect(screen.queryByRole('heading', { name: 'Task detail' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Nhập review')).not.toBeInTheDocument()
  })
})
