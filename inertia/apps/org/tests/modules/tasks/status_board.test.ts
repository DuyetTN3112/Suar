/* eslint-disable import-x/order */
import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import LayoutStub from '../../shared/test_stubs/layout_stub.svelte'


vi.mock('@/apps/org/shared/layouts/organization_layout.svelte', () => ({
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
  router: {
    patch: vi.fn(),
    reload: vi.fn(),
  },
}))

import TaskStatusBoardPage from '@/apps/org/modules/tasks/status_board.svelte'

describe('TaskStatusBoardPage', () => {
  it('renders pagination for status board slice', () => {
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

    expect(screen.getByText('21-40 / 45')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /previous page/i })).toHaveAttribute(
      'href',
      '/tasks/status-board?limit=20&page=1'
    )
  })
})
