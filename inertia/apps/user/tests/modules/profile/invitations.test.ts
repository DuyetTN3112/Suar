import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import ProfileInvitationsPage from '@/apps/user/modules/profile/invitations.svelte'

vi.mock('@/apps/user/shared/layouts/app_layout.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@inertiajs/svelte', () => ({
  page: {
    props: {},
  },
  router: {
    put: vi.fn(),
  },
}))

vi.mock('@/apps/user/shared/stores/translation.svelte', async () => {
  return import('#tests/frontend/translation_mock')
})

vi.mock('@/apps/user/shared/lib/ui_toast', () => ({
  uiToast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

describe('ProfileInvitationsPage', () => {
  it('renders true empty state when there are no pending invitations', () => {
    render(ProfileInvitationsPage, {
      props: {
        invitations: [],
        pagination: {
          mode: 'offset',
          page: 1,
          perPage: 10,
          total: 0,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    })

    expect(screen.getByRole('heading', { name: 'Lời mời tham gia tổ chức' })).toBeInTheDocument()
    expect(screen.getByText('Chưa có lời mời nào')).toBeInTheDocument()
    expect(
      screen.getByText('Hiện tại bạn chưa nhận được lời mời tham gia tổ chức nào.')
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Đồng ý' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Từ chối' })).not.toBeInTheDocument()
  })

  it('renders unified pagination for pending invitations', () => {
    render(ProfileInvitationsPage, {
      props: {
        invitations: [
          {
            organization_id: 'org-1',
            organization_name: 'Suar Org',
            organization_logo: null,
            org_role: 'org_member',
            invited_by: null,
            created_at: '2026-07-01T00:00:00.000Z',
          },
        ],
        pagination: {
          mode: 'offset',
          page: 2,
          perPage: 10,
          total: 24,
          lastPage: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      },
    })

    expect(screen.getByText('11-20 / 24')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /trang trước/i })).toHaveAttribute(
      'href',
      '/profile/invitations?page=1'
    )
  })
})
