/* eslint-disable import-x/order */
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import EmptyStub from '../test_stubs/empty_stub.svelte'

vi.mock('@/apps/user/shared/components/layout/notification_dropdown.svelte', () => ({
  default: EmptyStub,
}))

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

import { router } from '@inertiajs/svelte'
import NavBar from '@/apps/user/shared/components/layout/nav_bar.svelte'

const mockedRouter = vi.mocked(router)

describe('NavBar', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('submits trimmed search terms to the search route', async () => {
    render(NavBar)

    const search = screen.getByPlaceholderText('Search everything...')
    await fireEvent.input(search, { target: { value: '  quality gate  ' } })
    const form = search.closest('form')
    if (!form) {
      throw new Error('Search form not found')
    }
    await fireEvent.submit(form)

    expect(mockedRouter.visit.mock.calls).toContainEqual(['/search?q=quality%20gate'])
  })

  it('opens the authenticated user menu and exposes account actions', async () => {
    render(NavBar)

    await fireEvent.click(screen.getByRole('button', { name: /duyettn3112/i }))

    expect(screen.getAllByText('duyettn3112')).toHaveLength(2)
    expect(screen.getByText('Ho so')).toBeInTheDocument()
    expect(screen.getByText('Cai dat tai khoan')).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: /dang xuat/i }))

    expect(screen.getByText('Ban co chac muon dang xuat?')).toBeInTheDocument()
  })

  it('opens theme choices from the navbar theme button', async () => {
    render(NavBar)

    expect(screen.queryByText('Sáng')).not.toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: /theme/i }))

    expect(screen.getByText('Sáng')).toBeInTheDocument()
    expect(screen.getByText('Tối')).toBeInTheDocument()
    expect(screen.getByText('Hệ thống')).toBeInTheDocument()
  })
})
