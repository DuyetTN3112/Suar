/* eslint-disable import-x/order */
import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import LayoutStub from '../../shared/test_stubs/layout_stub.svelte'
import LinkStub from '../../shared/test_stubs/inertia_link_stub.svelte'

vi.mock('@/apps/org/shared/layouts/organization_layout.svelte', () => ({
  default: LayoutStub,
}))

vi.mock('@inertiajs/svelte', () => ({
  Link: LinkStub,
  router: {
    get: vi.fn(),
    visit: vi.fn(),
    reload: vi.fn(),
  },
}))

import OrgMembersPage from '@/apps/org/modules/members/index.svelte'

describe('OrgMembersPage', () => {
  it('keeps scoped filters but drops keyword search from pagination links', () => {
    render(OrgMembersPage, {
      props: {
        members: [
          {
            user_id: 'user-1',
            username: 'duyet',
            email: 'duyet@example.com',
            org_role: 'org_admin',
            status: 'approved',
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
          orgRole: 'org_admin',
          status: 'approved',
        },
        roleOptions: [{ value: 'org_admin', label: 'Admin' }],
      },
    })

    expect(screen.getByRole('link', { name: /previous page/i })).toHaveAttribute(
      'href',
      '/org/members?status=approved&org_role=org_admin&page=1'
    )
  })
})
