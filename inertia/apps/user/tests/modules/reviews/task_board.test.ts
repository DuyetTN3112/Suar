import { fireEvent, render, screen, within } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import TaskBoardPage from '@/apps/user/modules/reviews/task-board.svelte'

const inertiaMocks = vi.hoisted(() => ({
  router: {
    get: vi.fn(),
  },
  page: {
    url: '/projects/project-1/reviews/tasks',
    props: {
      auth: {
        user: {
          id: 'reviewer-1',
          current_organization_role: 'org_member',
          current_project: {
            id: 'project-1',
            name: 'Project One',
          },
          projects: [
            { id: 'project-1', name: 'Project One' },
            { id: 'project-2', name: 'Project Two' },
          ],
        },
      },
    },
  },
}))

vi.mock('@/apps/user/shared/layouts/app_layout.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@inertiajs/svelte', () => ({
  page: inertiaMocks.page,
  router: inertiaMocks.router,
}))

type WorkflowStatus =
  | 'awaiting_review'
  | 'in_review'
  | 'awaiting_response'
  | 'disputed'
  | 'reported'
  | 'ai_reviewing'
  | 'ai_failed'
  | 'resolved'
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
    inertiaMocks.page.props.auth.user.current_organization_role = 'org_member'
    inertiaMocks.page.props.auth.user.current_project = {
      id: 'project-1',
      name: 'Project One',
    }
  })

  it('shows the current project without duplicating project navigation', () => {
    render(TaskBoardPage, {
      props: boardProps,
    })

    expect(screen.getByText('Project One', { selector: 'p' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Bộ chọn dự án')).not.toBeInTheDocument()
  })

  it('keeps AI-reviewing cards in the reported lane and shows resolved work before Done', () => {
    const card = boardProps.board.columns[0]?.cards[0]
    if (!card) throw new Error('Expected the review board fixture card')

    render(TaskBoardPage, {
      props: {
        ...boardProps,
        board: {
          ...boardProps.board,
          columns: [
            ...boardProps.board.columns,
            {
              status: 'ai_reviewing' as WorkflowStatus,
              label: 'AI đang xử lý',
              cards: [],
            },
            {
              status: 'ai_failed' as WorkflowStatus,
              label: 'AI xử lý thất bại — cần thử lại',
              cards: [],
            },
            {
              status: 'reported' as WorkflowStatus,
              label: 'Đã gửi report tranh chấp',
              cards: [
                {
                  ...card,
                  status: 'reported' as WorkflowStatus,
                  workflowStatus: 'ai_reviewing',
                },
              ],
            },
            {
              status: 'resolved' as WorkflowStatus,
              label: 'Đã xử lý',
              cards: [],
            },
          ],
        },
      },
    })

    expect(screen.queryByText('AI đang xử lý')).not.toBeInTheDocument()
    expect(screen.queryByText('AI xử lý thất bại — cần thử lại')).not.toBeInTheDocument()
    expect(screen.getByText('Đã xử lý')).toBeInTheDocument()
    const reportedLabel = screen.getByText('Đã gửi report tranh chấp')
    const reportedLane = reportedLabel.parentElement?.parentElement?.parentElement
    expect(reportedLane).not.toBeNull()
    expect(
      within(reportedLane as HTMLElement).getByRole('button', {
        name: /Review delivered payment task/i,
      })
    ).toBeInTheDocument()
  })

  it('selects a task inline without leaving the review board', async () => {
    render(TaskBoardPage, {
      props: boardProps,
    })

    await fireEvent.click(screen.getByRole('button', { name: /Review delivered payment task/i }))

    expect(inertiaMocks.router.get).toHaveBeenCalledWith(
      '/projects/project-1/reviews/tasks?task_id=task-1',
      {},
      { preserveScroll: true, preserveState: true }
    )
  })

  it('keeps personal task review cards inside the personal route', async () => {
    render(TaskBoardPage, {
      props: {
        ...boardProps,
        workspaceMode: 'personal',
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: /Review delivered payment task/i }))

    expect(inertiaMocks.router.get).toHaveBeenCalledWith(
      '/reviews/tasks?task_id=task-1',
      {},
      { preserveScroll: true, preserveState: true }
    )
  })

  it('renders the selected task review workflow inline on the board', async () => {
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
          workflow: {
            id: 'workflow-1',
            status: 'awaiting_review',
          },
          reviewers: [
            {
              reviewer_id: 'reviewer-1',
              reviewer_name: 'Reviewer',
              reviewer_role: 'peer',
              status: 'pending',
              priority_rank: 1,
            },
          ],
          comments: [],
          reviewMessages: [],
        },
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Đánh giá & tranh chấp' }))

    expect(screen.getByRole('heading', { name: 'Đánh giá nhiệm vụ này' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nhập review')).toBeInTheDocument()
  })

  it('shows resolved separately and gives an organization governor the final Done control', async () => {
    inertiaMocks.page.props.auth.user.current_organization_role = 'org_admin'

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
          workflow: {
            id: 'workflow-1',
            status: 'resolved',
          },
          reviewers: [],
          comments: [],
          reviewMessages: [],
        },
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Đánh giá & tranh chấp' }))

    expect(screen.getByRole('heading', { name: 'Hoàn tất review cuối' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Đánh dấu review Done' })).toBeInTheDocument()
  })

  it('renders disabled lanes when no project is resolvable', () => {
    Object.assign(inertiaMocks.page.props.auth.user, {
      current_project: null,
      projects: [],
    })

    render(TaskBoardPage, {
      props: {
        projectId: null,
        selectedTaskId: null,
        detail: null,
        board: {
          projectId: null,
          columns: [],
        },
      },
    })

    expect(screen.queryByLabelText('Bộ chọn dự án')).not.toBeInTheDocument()
    expect(screen.getAllByText('Trống')).toHaveLength(8)
  })

  it('labels a card with no workflow as not opened', () => {
    const card = boardProps.board.columns[0]?.cards[0]
    if (!card) {
      throw new Error('Expected the review board fixture card')
    }

    render(TaskBoardPage, {
      props: {
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
                  ...card,
                  workflowId: null,
                  workflowStatus: 'not_opened',
                  requiredReviewCount: null,
                  waitingOnMe: false,
                },
              ],
            },
          ],
        },
      },
    })

    expect(screen.getByText('Review chưa được mở')).toBeInTheDocument()
    expect(screen.getByText('0/—')).toBeInTheDocument()
  })
})
