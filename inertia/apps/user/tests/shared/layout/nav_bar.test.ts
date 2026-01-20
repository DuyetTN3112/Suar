import { router } from '@inertiajs/svelte'
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import NavBar from '@/apps/user/shared/components/layout/nav_bar.svelte'

vi.mock('@/apps/user/shared/components/layout/notification_dropdown.svelte', async () => {
  const stubModule = await import('../test_stubs/empty_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@inertiajs/svelte', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@inertiajs/svelte')>()
  return {
    ...actual,
    page: {
      url: '/',
      props: {
        auth: {
          user: {
            id: 'user-1',
            username: 'duyettn3112',
            email: 'duyettn@suar.app',
            current_organization_role: 'org_owner',
          },
        },
      },
    },
    router: {
      visit: vi.fn(),
      post: vi.fn(),
    },
  }
})

const mockedRouter = vi.mocked(router)

describe('NavBar', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('submits trimmed search terms to the search route', async () => {
    render(NavBar)

    const search = screen.getByPlaceholderText('Tìm kiếm mọi thứ...')
    await fireEvent.input(search, { target: { value: '  quality gate  ' } })
    const form = search.closest('form')
    if (!form) {
      throw new Error('Search form not found')
    }
    await fireEvent.submit(form)

    expect(mockedRouter.visit.mock.calls).toContainEqual(['/search?q=quality+gate'])
  })

  it('opens the authenticated user menu and exposes account actions', async () => {
    render(NavBar)

    await fireEvent.click(screen.getByRole('button', { name: /duyettn3112/i }))

    expect(screen.getAllByText('duyettn3112')).toHaveLength(2)
    expect(screen.getByText('Hồ sơ')).toBeInTheDocument()
    expect(screen.getByText('Cài đặt tài khoản')).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: /đăng xuất/i }))

    expect(screen.getByText('Bạn có chắc muốn đăng xuất?')).toBeInTheDocument()
  })

  it('opens theme choices from the navbar theme button', async () => {
    render(NavBar)

    expect(screen.queryByText('Sáng')).not.toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: /giao diện/i }))

    expect(screen.getByText('Sáng')).toBeInTheDocument()
    expect(screen.getByText('Tối')).toBeInTheDocument()
    expect(screen.getByText('Theo hệ thống')).toBeInTheDocument()
  })
})
