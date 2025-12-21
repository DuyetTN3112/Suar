/* eslint-disable import-x/order */
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AppLayoutMarkerStub from '../../shared/test_stubs/app_layout_marker_stub.svelte'
import InertiaLinkStub from '../../shared/test_stubs/inertia_link_stub.svelte'

vi.mock('@/apps/user/shared/layouts/app_layout.svelte', () => ({
  default: AppLayoutMarkerStub,
}))

vi.mock('@inertiajs/svelte', () => ({
  Link: InertiaLinkStub,
  page: {
    props: {
      auth: {
        user: {
          id: 'user-1',
          username: 'duyettn3112',
          email: 'duyettn@suar.app',
          auth_method: 'google',
          user_profile: {
            bio: 'Old public bio',
          },
          user_urls: [{ url: 'https://duyet.dev' }],
        },
      },
    },
  },
  router: {
    post: vi.fn(),
  },
}))

import { router } from '@inertiajs/svelte'
import AccountSettingsPage from '@/apps/user/modules/settings/account.svelte'
import { FRONTEND_ROUTES } from '@/apps/user/shared/constants'

const mockedRouter = vi.mocked(router)

describe('Account settings page', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders account settings and the merged personal profile form', async () => {
    render(AccountSettingsPage)

    expect(screen.getByRole('heading', { name: 'Tài khoản & thông tin cá nhân' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Đăng nhập và danh tính' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Thông tin cá nhân' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Old public bio')).toBeInTheDocument()
    expect(screen.getByDisplayValue('https://duyet.dev')).toBeInTheDocument()

    await fireEvent.input(screen.getByLabelText('Giới thiệu'), {
      target: { value: 'Updated public bio' },
    })
    await fireEvent.click(screen.getByRole('button', { name: 'Cập nhật thông tin cá nhân' }))

    expect(mockedRouter.post.mock.calls).toContainEqual([
      FRONTEND_ROUTES.SETTINGS_PROFILE,
      {
        bio: 'Updated public bio',
        urls: ['https://duyet.dev'],
      },
      expect.objectContaining({
        preserveScroll: true,
        preserveState: true,
      }),
    ])
  })
})
