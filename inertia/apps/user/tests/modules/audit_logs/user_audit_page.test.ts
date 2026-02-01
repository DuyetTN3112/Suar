import { cleanup, fireEvent, render, screen } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import UserAuditLogPage from '@/apps/user/modules/audit_logs/audit_log_page.svelte'
import type {
  UserAuditActivityItem,
  UserAuditFilters,
} from '@/apps/user/modules/audit_logs/models/activity_item'
import type { CursorPagePagination } from '@/apps/user/shared/lib/pagination'

vi.mock('@/apps/user/shared/layouts/app_layout.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/app_layout_marker_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@inertiajs/svelte', () => ({
  page: {
    url: '/settings/audit-logs',
    props: {},
  },
  router: {
    visit: vi.fn(),
  },
}))

const pagination: CursorPagePagination = {
  mode: 'cursor',
  page: 1,
  perPage: 50,
  total: 1,
  lastPage: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  cursor: {
    nextCursor: null,
    previousCursor: null,
  },
}

const emptyFilters: UserAuditFilters = {
  search: '',
  resourceType: null,
  outcome: null,
  from: null,
  to: null,
  after: null,
  before: null,
}

const affectedEvent: UserAuditActivityItem = {
  id: 'personal-evidence-1',
  category: 'membership',
  outcome: 'success',
  title: 'server-fallback-not-used',
  description: 'server-description-not-used',
  occurredAt: '2026-07-23T08:30:00.000Z',
  activityKey: 'membership.role_changed',
  perspective: 'affected_you',
  actor: {
    type: 'another_authorized_user',
    label: 'server-actor-label-not-used',
  },
  subject: {
    category: 'membership',
    label: 'server-subject-label-not-used',
  },
  changes: [
    {
      field: 'org_role',
      operation: 'changed',
      before: 'member',
      after: 'org_admin',
      redacted: false,
    },
  ],
  changeCount: 1,
  hasHiddenChanges: true,
}

describe('user audit personal evidence page', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders perspective-first personal evidence and an accessible privacy-safe detail', async () => {
    render(UserAuditLogPage, {
      auditLogs: [affectedEvent],
      pagination,
      filters: emptyFilters,
      title: 'My audit log',
    })

    expect(
      screen.getByRole('heading', { name: /My audit log|Nhật ký hoạt động của tôi/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('list')).toBeInTheDocument()
    expect(
      screen.getByText(/Organization role changed|Đã thay đổi vai trò trong tổ chức/i)
    ).toBeInTheDocument()
    expect(screen.getByText(/Affected you|Tác động đến bạn/i)).toBeInTheDocument()
    expect(
      screen.getByText(/Authorized administrator|Quản trị viên được ủy quyền/i)
    ).toBeInTheDocument()
    expect(screen.queryByText('server-actor-label-not-used')).not.toBeInTheDocument()

    await fireEvent.click(
      screen.getByRole('button', {
        name: /View details for Organization role changed|Xem chi tiết Đã thay đổi vai trò trong tổ chức/i,
      })
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /What changed|Nội dung đã thay đổi/i })
    ).toBeInTheDocument()
    expect(screen.getByText('member')).toBeInTheDocument()
    expect(screen.getByText('org_admin')).toBeInTheDocument()
    expect(
      screen.getByText(/Personal privacy boundary|Ranh giới riêng tư cá nhân/i)
    ).toBeInTheDocument()
    expect(screen.getByText('personal-evidence-1')).toBeInTheDocument()
    expect(document.body.textContent).not.toContain('requestId')
    expect(document.body.textContent).not.toContain('traceId')
    expect(document.body.textContent).not.toContain('server-description-not-used')
  })

  it('distinguishes a filtered empty result from a new account', () => {
    render(UserAuditLogPage, {
      auditLogs: [],
      pagination: { ...pagination, total: 0 },
      filters: { ...emptyFilters, search: 'login' },
      title: 'My audit log',
    })

    expect(
      screen.getByRole('heading', {
        name: /No personal records match these filters|Không có bản ghi cá nhân phù hợp với bộ lọc/i,
      })
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: /Clear filters|Xóa bộ lọc/i }).length
    ).toBeGreaterThan(0)
    expect(
      screen.queryByText(/No personal activity yet|Chưa có hoạt động cá nhân/i)
    ).not.toBeInTheDocument()
  })
})
