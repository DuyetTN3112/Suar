import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@inertiajs/svelte', () => ({
  router: {
    get: vi.fn(),
    post: vi.fn(),
    visit: vi.fn(),
  },
}))

import RequireOrganizationPage from '@/apps/admin/modules/errors/require_organization.svelte'

describe('RequireOrganizationPage', () => {
  it('drops keyword search from pagination links', () => {
    render(RequireOrganizationPage, {
      props: {
        organizations: [
          {
            id: 'org-1',
            name: 'Acme',
            description: 'Search-first org',
            logo: null,
            website: null,
            membership_status: null,
          },
        ],
        pagination: {
          mode: 'offset',
          total: 24,
          perPage: 20,
          page: 2,
          lastPage: 2,
          hasNextPage: false,
          hasPreviousPage: true,
        },
        filters: {
          search: 'acme',
        },
      },
    })

    expect(screen.getByRole('link', { name: /trang trước/i })).toHaveAttribute(
      'href',
      '/errors/require-organization?page=1'
    )
  })
})
