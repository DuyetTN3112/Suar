import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import MyApplicationsPage from '@/apps/user/modules/applications/my-applications.svelte'

const inertiaMocks = vi.hoisted(() => ({
  router: {
    reload: vi.fn(),
    visit: vi.fn(),
  },
}))

const toastMocks = vi.hoisted(() => ({
  error: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
}))

vi.mock('@inertiajs/svelte', () => ({
  router: inertiaMocks.router,
}))

vi.mock('@/apps/user/shared/layouts/app_layout.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/shared/lib/ui_toast', () => ({
  uiToast: toastMocks,
}))

vi.mock('@/apps/user/shared/stores/translation.svelte', async () => {
  return import('#tests/frontend/translation_mock')
})

const pendingApplication = {
  id: 'application-1',
  task_id: 'task-1',
  task: { id: 'task-1', title: 'Stale withdraw task', status: 'todo' },
  status: 'pending' as const,
  cover_letter: 'Ready to help',
  portfolio_links: [],
  rejection_reason: null,
  created_at: '2026-07-14T00:00:00.000Z',
  updated_at: '2026-07-14T00:00:00.000Z',
  organization_name: 'Suar Org',
  project_name: 'Marketplace',
  withdrawn_at: null,
  lifecycle_events: [],
  can_withdraw: true,
}

function renderPage() {
  render(MyApplicationsPage, {
    props: {
      applications: [pendingApplication],
      pagination: {
        mode: 'offset',
        page: 1,
        perPage: 10,
        total: 1,
        lastPage: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      },
      statusFilter: 'pending',
    },
  })
}

describe('MyApplicationsPage withdraw action', () => {
  afterEach(() => {
    cleanup()
    document.head.innerHTML = ''
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('shows an error and keeps the pending row when backend rejects a stale withdraw', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 409 }))
    vi.stubGlobal('fetch', fetchMock)
    document.head.insertAdjacentHTML('beforeend', '<meta name="csrf-token" content="csrf-token-1">')

    renderPage()

    await fireEvent.click(screen.getByRole('button', { name: 'Rút đề xuất' }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/applications/application-1/withdraw', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': 'csrf-token-1',
        },
        credentials: 'same-origin',
      })
    })

    await waitFor(() => {
      expect(toastMocks.error).toHaveBeenCalledWith('Không thể rút đề xuất tham gia', undefined)
    })
    expect(toastMocks.success).not.toHaveBeenCalled()
    expect(inertiaMocks.router.reload).not.toHaveBeenCalled()
    expect(screen.getByText('Stale withdraw task')).toBeInTheDocument()
    expect(screen.getAllByText('Chờ duyệt').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Rút đề xuất' })).toBeEnabled()
  })

  it('reloads only application page props after a successful withdraw', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    document.head.insertAdjacentHTML('beforeend', '<meta name="csrf-token" content="csrf-token-1">')

    renderPage()

    await fireEvent.click(screen.getByRole('button', { name: 'Rút đề xuất' }))

    await waitFor(() => {
      expect(inertiaMocks.router.reload).toHaveBeenCalledWith({
        only: ['applications', 'pagination', 'statusFilter', 'flash'],
      })
    })
  })
})
