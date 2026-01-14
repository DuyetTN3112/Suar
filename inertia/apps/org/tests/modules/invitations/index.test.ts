import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import OrgInvitationsPage from '@/apps/org/modules/invitations/index.svelte'
vi.mock('@/apps/org/shared/layouts/organization_layout.svelte', () => import('../../shared/test_stubs/layout_stub.svelte'))

const inertiaMocks = vi.hoisted(() => ({
  get: vi.fn(),
  reload: vi.fn(),
  visit: vi.fn(),
}))

vi.mock('@inertiajs/svelte', () => ({
  router: inertiaMocks,
}))

describe('OrgInvitationsPage', () => {
  afterEach(() => {
    inertiaMocks.get.mockReset()
    inertiaMocks.reload.mockReset()
    inertiaMocks.visit.mockReset()
    vi.unstubAllGlobals()
  })

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

    expect(screen.getByRole('link', { name: /trang trước/i })).toHaveAttribute(
      'href',
      '/org/invitations?search=member%40example.com&page=1'
    )
  })

  it('shows the missing-account invite error with the target email and does not reload', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(new Response(
          JSON.stringify({ message: 'Không tìm thấy người dùng với email này' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        ))
      )
    )

    render(OrgInvitationsPage, {
      props: {
        invitations: [],
        pagination: {
          mode: 'offset',
          total: 0,
          perPage: 20,
          page: 1,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        filters: {
          search: '',
          status: '',
        },
        roleOptions: [{ value: 'org_member', label: 'Thành viên' }],
      },
    })

    await fireEvent.click(screen.getByRole('button', { name: 'Mời thành viên' }))
    await fireEvent.input(screen.getByLabelText('Email'), {
      target: { value: 'missing@example.com' },
    })
    const submitInviteButton = screen.getAllByRole('button', { name: 'Mời thành viên' })[1]
    if (!submitInviteButton) {
      throw new Error('Expected the invite dialog submit button')
    }
    await fireEvent.click(submitInviteButton)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('missing@example.com')
    expect(alert).toHaveTextContent('Không tìm thấy người dùng với email này')
    await waitFor(() => {
      expect(inertiaMocks.reload).not.toHaveBeenCalled()
    })
  })
})
