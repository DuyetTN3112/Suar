import { render, screen } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'

import AdminUsersPage from '@/apps/admin/modules/users/index.svelte'

describe('AdminUsersPage', () => {
  it('keeps scoped filters but drops keyword search from pagination links', () => {
    render(AdminUsersPage, {
      props: {
        users: [
          {
            id: 'user-1',
            username: 'duyet',
            email: 'duyet@example.com',
            system_role: 'system_admin',
            status: 'active',
            created_at: '2026-07-05T12:00:00.000Z',
          },
        ],
        pagination: {
          mode: 'offset',
          total: 60,
          perPage: 20,
          page: 2,
          lastPage: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        },
        filters: {
          search: 'duyet',
          systemRole: 'system_admin',
          status: 'active',
        },
      },
    })

    expect(screen.getByRole('link', { name: /trang trước/i })).toHaveAttribute(
      'href',
      '/admin/users?system_role=system_admin&status=active&page=1'
    )
    expect(screen.getByRole('link', { name: /trang tiếp theo/i })).toHaveAttribute(
      'href',
      '/admin/users?system_role=system_admin&status=active&page=3'
    )
  })
})
