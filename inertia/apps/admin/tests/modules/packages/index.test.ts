import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

const routerMocks = vi.hoisted(() => ({
  put: vi.fn(),
}))

vi.mock('@inertiajs/svelte', () => ({
  router: {
    put: routerMocks.put,
  },
}))

import AdminPackagesPage from '@/apps/admin/modules/packages/index.svelte'

describe('AdminPackagesPage', () => {
  function renderPackagesPage() {
    render(AdminPackagesPage, {
      props: {
        stats: {
          total: 40,
          active: 30,
          expiringSoon: 5,
          cancelled: 10,
          byPlan: { pro: 12, enterprise: 8, promax: 8 },
        },
        subscriptions: [
          {
            id: 'sub-1',
            user_id: 'user-1',
            username: 'duyet',
            email: 'duyet@example.com',
            system_role: 'registered_user',
            plan: 'pro',
            status: 'active',
            started_at: '2026-07-01T00:00:00.000Z',
            expires_at: '2026-08-01T00:00:00.000Z',
            auto_renew: true,
            created_at: '2026-07-01T00:00:00.000Z',
            updated_at: '2026-07-05T12:00:00.000Z',
          },
        ],
        pagination: {
          mode: 'offset',
          total: 40,
          perPage: 20,
          page: 2,
          lastPage: 4,
          hasNextPage: true,
          hasPreviousPage: true,
        },
        filters: {
          search: 'duyet',
          plan: 'pro',
          status: 'active',
        },
        packages: [
          {
            id: 'pkg-pro',
            storagePlan: 'pro',
            name: 'Pro',
            priceLabel: '$10',
            features: ['Priority matching', 'Advanced reporting'],
          },
        ],
      },
    })
  }

  it('preserves package filters in pagination links', () => {
    renderPackagesPage()

    expect(screen.getByRole('link', { name: /previous page/i })).toHaveAttribute(
      'href',
      '/admin/packages?search=duyet&plan=pro&status=active&page=1'
    )
    expect(screen.getByRole('link', { name: /next page/i })).toHaveAttribute(
      'href',
      '/admin/packages?search=duyet&plan=pro&status=active&page=3'
    )
  })

  it('renders package cards and subscription rows with exact visible values', () => {
    renderPackagesPage()

    expect(screen.getByRole('heading', { name: 'Pro 12 user' })).toBeInTheDocument()
    expect(screen.getByText('$10')).toBeInTheDocument()
    expect(screen.getByText('• Priority matching')).toBeInTheDocument()
    expect(screen.getByText('• Advanced reporting')).toBeInTheDocument()
    expect(screen.getByText('12 user')).toBeInTheDocument()

    expect(screen.getByText('duyet')).toBeInTheDocument()
    expect(screen.getByText('duyet@example.com')).toBeInTheDocument()
    expect(screen.getAllByText('pro').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('1/8/2026')).toBeInTheDocument()
  })

  it('sends exact subscription update payloads from row controls', async () => {
    renderPackagesPage()

    await fireEvent.click(screen.getByRole('button', { name: 'ProMax' }))
    expect(routerMocks.put).toHaveBeenCalledWith(
      '/admin/packages/sub-1',
      { plan: 'promax' },
      expect.objectContaining({ preserveScroll: true, preserveState: true })
    )

    await fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(routerMocks.put).toHaveBeenCalledWith(
      '/admin/packages/sub-1',
      { status: 'cancelled', auto_renew: false },
      expect.objectContaining({ preserveScroll: true, preserveState: true })
    )
  })

  it('shows field errors from invalid custom plan and status without changing the visible row', async () => {
    renderPackagesPage()

    await fireEvent.input(screen.getByLabelText('Plan tùy chỉnh cho duyet'), {
      target: { value: 'not-a-plan' },
    })
    await fireEvent.input(screen.getByLabelText('Trạng thái tùy chỉnh cho duyet'), {
      target: { value: 'not-a-status' },
    })
    await fireEvent.click(screen.getByRole('button', { name: 'Áp dụng tùy chỉnh cho duyet' }))

    expect(routerMocks.put).toHaveBeenCalledWith(
      '/admin/packages/sub-1',
      { plan: 'not-a-plan', status: 'not-a-status' },
      expect.objectContaining({ preserveScroll: true, preserveState: true })
    )

    const options = routerMocks.put.mock.calls.at(-1)?.[2] as {
      onError?: (errors: Record<string, string>) => void
    }
    options.onError?.({
      plan: 'Gói đăng ký không hợp lệ',
      status: 'Trạng thái đăng ký không hợp lệ',
    })

    expect(await screen.findByText('Gói đăng ký không hợp lệ')).toBeInTheDocument()
    expect(screen.getByText('Trạng thái đăng ký không hợp lệ')).toBeInTheDocument()
    expect(screen.getByText('duyet')).toBeInTheDocument()
    expect(screen.getAllByText('pro').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('active')).toBeInTheDocument()
  })
})
