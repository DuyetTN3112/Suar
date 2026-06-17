import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import OrgInvitationsPage from '@/apps/org/modules/invitations/index.svelte'
vi.mock('@/apps/org/shared/layouts/organization_layout.svelte', () => import('../../shared/test_stubs/layout_stub.svelte'))

vi.mock('@inertiajs/svelte', () => ({
  router: {
    get: vi.fn(),
    visit: vi.fn(),
    reload: vi.fn(),
  },
}))

describe('OrgInvitationsPage', () => {
  it('preserves invitation search filter in pagination links', () => {
    render(OrgInvitationsPage, {
      props: {
        invitations: [
          {
            id: 'invite-1',
            email: 'member@example.com',
            org_role: 'org_member',
            invited_by: { id: 'user-1', username: 'duyet' },
            status: 'pending',
            invited_at: '2026-07-05T12:00:00.000Z',
            expires_at: '2026-07-10T12:00:00.000Z',
          },
        ],
        pagination: {
          mode: 'offset',
          total: 25,
          perPage: 20,
          page: 2,
          lastPage: 2,
          hasNextPage: false,
          hasPreviousPage: true,
        },
        filters: {
          search: 'member@example.com',
          status: '',
        },
        roleOptions: [{ value: 'org_member', label: 'Thành viên' }],
      },
    })

    expect(screen.getByRole('link', { name: /previous page/i })).toHaveAttribute(
      'href',
      '/org/invitations?search=member%40example.com&page=1'
    )
  })
})
