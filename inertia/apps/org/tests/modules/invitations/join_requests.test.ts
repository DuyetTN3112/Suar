import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import OrgJoinRequestsPage from '@/apps/org/modules/invitations/requests.svelte'

vi.mock('@/apps/org/shared/layouts/organization_layout.svelte', () => import('../../shared/test_stubs/layout_stub.svelte'))

vi.mock('@inertiajs/svelte', () => ({
  router: {
    get: vi.fn(),
    put: vi.fn(),
    visit: vi.fn(),
    reload: vi.fn(),
  },
}))

describe('OrgJoinRequestsPage', () => {
  it('drops keyword search from pagination links', () => {
    render(OrgJoinRequestsPage, {
      props: {
        requests: [
          {
            user_id: 'user-1',
            username: 'duyet',
            email: 'duyet@example.com',
            org_role: 'org_member',
            status: 'pending',
            created_at: '2026-07-05T12:00:00.000Z',
          },
        ],
        pagination: {
          mode: 'offset',
          total: 70,
          perPage: 50,
          page: 2,
          lastPage: 2,
          hasNextPage: false,
          hasPreviousPage: true,
        },
        filters: {
          search: 'duyet',
        },
      },
    })

    expect(screen.getByRole('link', { name: /trang trước/i })).toHaveAttribute(
      'href',
      '/org/invitations/requests?page=1'
    )
  })
})
