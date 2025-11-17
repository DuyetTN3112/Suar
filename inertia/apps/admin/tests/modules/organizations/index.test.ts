import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import AdminOrganizationsPage from '@/apps/admin/modules/organizations/index.svelte'

describe('AdminOrganizationsPage', () => {
  it('preserves search filter in pagination links', () => {
    render(AdminOrganizationsPage, {
      props: {
        organizations: [
          {
            id: 'org-1',
            name: 'Suar Labs',
            description: 'Test organization',
            owner: {
              id: 'user-1',
              username: 'duyet',
              email: 'duyet@example.com',
            },
            created_at: '2026-07-05T12:00:00.000Z',
            updated_at: '2026-07-05T12:00:00.000Z',
            _count: {
              members: 12,
              projects: 4,
            },
          },
        ],
        pagination: {
          mode: 'offset',
          total: 30,
          perPage: 24,
          page: 2,
          lastPage: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        },
        filters: {
          search: 'suar',
        },
      },
    })

    expect(screen.getByRole('link', { name: /previous page/i })).toHaveAttribute(
      'href',
      '/admin/organizations?search=suar&page=1'
    )
    expect(screen.getByRole('link', { name: /next page/i })).toHaveAttribute(
      'href',
      '/admin/organizations?search=suar&page=3'
    )
  })
})
