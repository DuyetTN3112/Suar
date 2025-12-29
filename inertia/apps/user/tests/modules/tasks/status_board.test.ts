/* eslint-disable import-x/order */
import { fireEvent, render, screen } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import LayoutStub from '../../shared/test_stubs/layout_stub.svelte'

const inertiaMocks = vi.hoisted(() => ({
  router: {
    patch: vi.fn(),
    reload: vi.fn(),
  },
}))

vi.mock('@/apps/user/shared/layouts/app_layout.svelte', () => ({
  default: LayoutStub,
}))

vi.mock('@/apps/user/shared/layouts/organization_layout.svelte', () => ({
  default: LayoutStub,
}))

vi.mock('@inertiajs/svelte', () => ({
  page: {
    props: {
      auth: {
        user: {
          current_organization_role: null,
        },
      },
    },
  },
  router: inertiaMocks.router,
}))

import TaskStatusBoardPage from '@/apps/user/modules/tasks/status_board.svelte'

describe('TaskStatusBoardPage', () => {
  function renderBoard() {
    render(TaskStatusBoardPage, {
      props: {
        items: [{ id: 'task-21', name: 'Audit pagination', createdById: 'user-1' }],
        metadata: { total: 45 },
        pagination: {
          mode: 'offset',
          page: 2,
          perPage: 20,
          total: 45,
          lastPage: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        },
        auth: {
          user: {
            current_organization_role: 'org_member',
          },
        },
      },
    })
  }

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders pagination for status board slice', () => {
    renderBoard()

    expect(screen.getByText('21-40 / 45')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /previous page/i })).toHaveAttribute(
      'href',
      '/tasks/status-board?limit=20&page=1'
    )
  })

  it('shows conflict state, keeps current rows, and reloads slice on a 409 board mutation', async () => {
    inertiaMocks.router.patch.mockImplementation((_url, _payload, options: { onError: (errors: { status: number }) => void }) => {
      options.onError({ status: 409 })
    })

    renderBoard()

    await fireEvent.click(screen.getByLabelText('Giả lập xung đột'))
    await fireEvent.click(screen.getByRole('button', { name: 'Chạy thử cập nhật' }))

    expect(inertiaMocks.router.patch).toHaveBeenCalledWith(
      '/api/v1/tasks/board-state',
      { total: 45, simulateConflict: true },
      expect.objectContaining({
        preserveState: true,
        preserveScroll: true,
      })
    )
    expect(screen.getByText('Concurrent update detected. Syncing latest server state.')).toBeInTheDocument()
    expect(screen.getByText('Audit pagination')).toBeInTheDocument()
    expect(screen.queryByText('Mutation failed. Please retry or reload the page.')).not.toBeInTheDocument()
    expect(inertiaMocks.router.reload).toHaveBeenCalledWith({
      only: ['items', 'metadata', 'flash'],
    })
  })
})
