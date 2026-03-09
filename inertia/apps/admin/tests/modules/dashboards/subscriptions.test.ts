import { cleanup, render, screen } from '@testing-library/svelte'
import { afterEach, describe, expect, it } from 'vitest'

import AdminDashboardPage from '@/apps/admin/modules/dashboards/index.svelte'
import AdminDashboardSubscriptionsPage from '@/apps/admin/modules/dashboards/subscriptions.svelte'

const stats = {
  users: { total: 10, active: 8, suspended: 1, new_this_month: 2 },
  organizations: { total: 3, new_this_month: 1 },
  projects: { total: 4, active: 3, completed: 1 },
  tasks: { total: 12, in_progress: 5, completed: 7 },
  subscriptions: { total: 35, active: 20, expiring_soon: 3, pro: 8, promax: 6 },
  moderation: { pending_flagged_reviews: 2 },
}

const zeroStats = {
  users: { total: 0, active: 0, suspended: 0, new_this_month: 0 },
  organizations: { total: 0, new_this_month: 0 },
  projects: { total: 0, active: 0, completed: 0 },
  tasks: { total: 0, in_progress: 0, completed: 0 },
  subscriptions: { total: 0, active: 0, expiring_soon: 0, pro: 0, promax: 0 },
  moderation: { pending_flagged_reviews: 0 },
}

describe('AdminDashboardSubscriptionsPage', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders pagination for subscription accounts', () => {
    render(AdminDashboardSubscriptionsPage, {
      props: {
        stats,
        subscriptionStats: {
          total: 35,
          active: 20,
          expiringSoon: 3,
          cancelled: 2,
          byPlan: { free: 21, pro: 8, promax: 6 },
        },
        subscriptions: [
          {
            id: 'sub-11',
            user_id: 'user-11',
            username: 'linh',
            email: 'linh@example.com',
            system_role: 'registered_user',
            plan: 'pro',
            status: 'active',
            started_at: '2026-07-01T00:00:00.000Z',
            expires_at: '2026-08-01T00:00:00.000Z',
            auto_renew: true,
            created_at: '2026-07-01T00:00:00.000Z',
            updated_at: '2026-07-02T00:00:00.000Z',
          },
        ],
        pagination: {
          mode: 'offset',
          page: 2,
          perPage: 10,
          total: 35,
          lastPage: 4,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      },
    })

    expect(screen.getByText('11-20 / 35')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /trang trước/i })).toHaveAttribute(
      'href',
      '/admin/dashboards/subscriptions?page=1'
    )
  })

  it('renders zero dashboard stats without leaking NaN, Infinity, or undefined values', () => {
    const { container } = render(AdminDashboardPage, {
      props: {
        stats: zeroStats,
      },
    })

    expect(screen.getByRole('img', { name: 'Quy mô hệ thống' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Luồng thực thi' })).toBeInTheDocument()
    expect(screen.getByText('Cơ cấu gói đăng ký')).toBeInTheDocument()
    expect(screen.getAllByText('0').length).toBeGreaterThan(8)

    const renderedOutput = container.textContent
    const serializedDom = container.innerHTML

    expect(renderedOutput).not.toMatch(/NaN|Infinity|undefined/)
    expect(serializedDom).not.toMatch(/NaN|Infinity|undefined/)
    expect(serializedDom).toContain('width: 0%')
  })
})
