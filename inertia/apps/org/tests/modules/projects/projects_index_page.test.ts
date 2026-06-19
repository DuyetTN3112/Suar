/* eslint-disable import-x/order */
import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import LayoutStub from '../../shared/test_stubs/layout_stub.svelte'


vi.mock('@/apps/org/shared/layouts/organization_layout.svelte', () => ({
  default: LayoutStub,
}))

vi.mock('@inertiajs/svelte', () => ({
  page: {
    url: '/projects?page=2',
    props: {
      auth: {
        user: {
          current_organization_role: null,
        },
      },
    },
  },
  router: {
    get: vi.fn(),
    visit: vi.fn(),
    reload: vi.fn(),
  },
}))

import ProjectsIndexPage from '@/apps/org/modules/projects/index.svelte'

describe('ProjectsIndexPage', () => {
  it('preserves project filters in pagination links', () => {
    render(ProjectsIndexPage, {
      props: {
        projects: [
          {
            id: 'project-1',
            name: 'Apollo',
            description: 'Apollo staffing project',
            organization_id: 'org-1',
            creator_id: 'user-1',
            status: 'in_progress',
            created_at: '2026-07-05T12:00:00.000Z',
            updated_at: '2026-07-05T12:00:00.000Z',
          },
        ],
        pagination: {
          mode: 'offset',
          page: 2,
          perPage: 20,
          total: 35,
          lastPage: 2,
          hasNextPage: false,
          hasPreviousPage: true,
        },
        filters: {
          search: 'apollo',
        },
        stats: {
          total_projects: 1,
          active_projects: 1,
          completed_projects: 0,
        },
        auth: {
          user: null,
        },
      },
    })

    expect(screen.getByRole('link', { name: /previous page/i })).toHaveAttribute(
      'href',
      '/org/projects?search=apollo&page=1'
    )
    expect(screen.getByText('21-35 / 35')).toBeInTheDocument()
  })
})
