import { cleanup, fireEvent, render, screen } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import OrgMembersPage from '@/apps/org/modules/members/index.svelte'

import MembersContractHarness from './members_contract_harness.svelte'

vi.mock('@/apps/org/shared/layouts/organization_layout.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

const inertiaMocks = vi.hoisted(() => ({
  router: {
    get: vi.fn(),
    visit: vi.fn(),
    reload: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
  page: {
    props: {
      auth: {
        user: {
          id: 'user-1',
          current_organization_role: 'org_admin',
        },
      },
    },
  },
}))

vi.mock('@inertiajs/svelte', () => inertiaMocks)

describe('OrgMembersPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    inertiaMocks.page.props.auth.user.id = 'user-1'
    inertiaMocks.page.props.auth.user.current_organization_role = 'org_admin'
  })

  const baseProps = {
    members: [
      {
        user_id: 'user-2',
        username: 'duyet',
        email: 'duyet@example.com',
        org_role: 'org_admin',
        status: 'approved',
        created_at: '2026-07-05T12:00:00.000Z',
      },
      {
        user_id: 'user-1',
        username: 'me',
        email: 'me@example.com',
        org_role: 'org_member',
        status: 'pending',
        created_at: '2026-07-05T12:00:00.000Z',
      },
    ],
    pagination: {
      mode: 'offset' as const,
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
    roleOptions: [
      { value: 'org_admin', label: 'Admin' },
      { value: 'org_member', label: 'Member' },
      { value: 'org_mentor', label: 'Mentor' },
    ],
    auth: {
      user: {
        id: 'user-1',
        current_organization_role: 'org_admin',
      },
    },
  }

  it('keeps scoped filters but drops keyword search from pagination links', () => {
    render(OrgMembersPage, { props: baseProps })

    expect(screen.getByRole('link', { name: /trang trước/i })).toHaveAttribute(
      'href',
      '/org/members?status=approved&org_role=org_admin&page=1'
    )
  })

  it('shows add users for managing viewers', () => {
    render(OrgMembersPage, {
      props: {
        ...baseProps,
        members: [],
        auth: {
          user: {
            id: 'user-1',
            current_organization_role: 'org_owner',
          },
        },
      },
    })

    expect(
      screen.getByRole('button', { name: /add (users|members)|thêm người dùng vào tổ chức/i })
    ).toBeInTheDocument()
  })

  it.each(['org_admin', 'org_owner'] as const)(
    'shows member actions for other users as %s',
    (currentUserRole) => {
      render(MembersContractHarness, {
        props: {
          members: [
            {
              user_id: 'user-1',
              username: 'Me',
              email: 'me@example.com',
              org_role: currentUserRole,
              status: 'pending',
              invited_by: null,
              created_at: '2026-07-05T12:00:00.000Z',
            },
            {
              user_id: 'user-2',
              username: 'Other member',
              email: 'other@example.com',
              org_role: 'org_member',
              status: 'pending',
              invited_by: null,
              created_at: '2026-07-05T12:00:00.000Z',
            },
          ],
          roleOptions: [
            { value: 'org_owner', label: 'Owner' },
            { value: 'org_admin', label: 'Admin' },
            { value: 'org_member', label: 'Member' },
          ],
          currentUserId: 'user-1',
          currentUserRole,
        },
      })

      expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Change role' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Remove' })).toHaveAttribute(
        'href',
        '/org/members/user-2'
      )
    }
  )

  it('hides approve for pending invitations but keeps it for join requests', () => {
    render(OrgMembersPage, {
      props: {
        ...baseProps,
        members: [
          {
            user_id: 'join-request-user',
            username: 'Join request',
            email: 'join@example.com',
            org_role: 'org_member',
            status: 'pending',
            created_at: '2026-07-05T12:00:00.000Z',
            invited_by: null,
          },
          {
            user_id: 'invite-user',
            username: 'Invitation',
            email: 'invite@example.com',
            org_role: 'org_member',
            status: 'pending',
            created_at: '2026-07-05T12:00:00.000Z',
            invited_by: 'user-99',
          },
        ],
        auth: {
          user: {
            id: 'user-1',
            current_organization_role: 'org_admin',
          },
        },
      },
    })

    expect(screen.getAllByRole('button', { name: /approve|phê duyệt/i })).toHaveLength(1)
  })

  it('hides member actions on the self row', () => {
    render(MembersContractHarness, {
      props: {
        members: [
          {
            user_id: 'user-1',
            username: 'Me',
            email: 'me@example.com',
            org_role: 'org_admin',
            status: 'approved',
            created_at: '2026-07-05T12:00:00.000Z',
          },
        ],
        roleOptions: [{ value: 'org_member', label: 'Member' }],
        currentUserId: 'user-1',
        currentUserRole: 'org_admin',
      },
    })

    expect(screen.queryByRole('button', { name: 'Change role' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Remove' })).not.toBeInTheDocument()
  })

  it('renders custom role options and updates the selected option', async () => {
    render(MembersContractHarness, {
      props: {
        members: [],
        roleOptions: [
          { value: 'org_lead', label: 'Lead' },
          { value: 'org_contributor', label: 'Contributor' },
        ],
        currentUserId: 'user-1',
        currentUserRole: 'org_owner',
      },
    })

    const roleSelect = screen.getByLabelText('Role')
    expect(screen.getByRole('option', { name: 'Lead' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Contributor' })).toBeInTheDocument()

    await fireEvent.change(roleSelect, { target: { value: 'org_contributor' } })

    expect(screen.getByTestId('selected-role-label')).toHaveTextContent('Contributor')
  })

  it('points the remove action at /org/members/:id', () => {
    render(MembersContractHarness, {
      props: {
        members: [
          {
            user_id: 'user-99',
            username: 'Delete target',
            email: 'delete@example.com',
            org_role: 'org_member',
            status: 'approved',
            created_at: '2026-07-05T12:00:00.000Z',
          },
        ],
        roleOptions: [{ value: 'org_member', label: 'Member' }],
        currentUserId: 'user-1',
        currentUserRole: 'org_owner',
      },
    })

    expect(screen.getByRole('link', { name: 'Remove' })).toHaveAttribute(
      'href',
      '/org/members/user-99'
    )
  })
})
