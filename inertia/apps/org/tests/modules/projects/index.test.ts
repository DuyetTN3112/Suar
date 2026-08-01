import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import OrgProjectsPage from '@/apps/org/modules/projects/index.svelte'
vi.mock('@/apps/org/shared/layouts/organization_layout.svelte', () => import('../../shared/test_stubs/layout_stub.svelte'))

const { router } = vi.hoisted(() => ({
  router: {
    get: vi.fn(),
    visit: vi.fn(),
  },
}))

vi.mock('@inertiajs/svelte', () => ({
  router,
  page: {
    url: '/org/projects?search=apollo',
  },
}))

describe('OrgProjectsPage', () => {
  const baseProps = {
    projects: [
      {
        id: 'project-1',
        name: 'Apollo',
        description: 'Staffing-first project',
        organization_id: 'org-1',
        creator_id: 'user-1',
        status: 'pending',
        created_at: '2026-07-05T12:00:00.000Z',
        updated_at: '2026-07-05T12:00:00.000Z',
      },
    ],
    pagination: {
      mode: 'offset' as const,
      total: 30,
      perPage: 20,
      page: 2,
      lastPage: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    },
    filters: {
      search: 'apollo',
      status: '',
    },
    stats: {
      total_projects: 1,
      active_projects: 0,
      completed_projects: 0,
    },
    auth: {
      user: null,
    },
  }

  it('preserves project search query params in pagination links', () => {
    render(OrgProjectsPage, { props: baseProps })

    expect(screen.getByRole('link', { name: /trang trước/i })).toHaveAttribute(
      'href',
      '/org/projects?search=apollo&page=1'
    )
    expect(screen.getByRole('link', { name: /trang tiếp theo/i })).toHaveAttribute(
      'href',
      '/org/projects?search=apollo&page=3'
    )
  })

  it('keeps sprint management out of project list row actions', () => {
    render(OrgProjectsPage, { props: baseProps })

    expect(screen.queryByRole('link', { name: /sprint/i })).not.toBeInTheDocument()
  })

  it('opens project detail from the portfolio list instead of a modal-only surface', async () => {
    render(OrgProjectsPage, { props: baseProps })

    const detailButton = screen.getAllByRole('button', {
      name: /view project detail|xem chi tiết/i,
    })[0]
    if (!detailButton) {
      throw new Error('Expected the project detail button')
    }
    await fireEvent.click(detailButton)

    expect(router.visit).toHaveBeenCalledWith('/projects/project-1')
  })
})
