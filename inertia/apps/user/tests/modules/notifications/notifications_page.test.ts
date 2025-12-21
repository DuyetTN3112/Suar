/* eslint-disable import-x/order */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import LayoutStub from '../../shared/test_stubs/layout_stub.svelte'

vi.mock('@/apps/user/shared/layouts/app_layout.svelte', () => ({
  default: LayoutStub,
}))

vi.mock('@/apps/user/shared/layouts/organization_layout.svelte', () => ({
  default: LayoutStub,
}))

vi.mock('@inertiajs/svelte', () => ({
  page: {
    props: {
      auth: {
        user: {
          current_organization_role: null,
        },
      },
    },
  },
  router: {
    get: vi.fn(),
    visit: vi.fn(),
  },
}))

import NotificationsPage from '@/apps/user/modules/notifications/index.svelte'

const unreadNotification = {
  id: 'notification-1',
  type: 'info' as const,
  title: 'First',
  message: 'First notification',
  related_entity_type: null,
  related_entity_id: null,
  read_at: null,
  created_at: '2026-07-05T12:00:00.000Z',
}

function renderNotificationsPage() {
  render(NotificationsPage, {
    props: {
      notifications: [unreadNotification],
      pagination: {
        mode: 'cursor',
        total: 3,
        perPage: 1,
        page: 1,
        lastPage: 3,
        hasNextPage: true,
        hasPreviousPage: true,
        cursor: {
          nextCursor: 'cursor-older',
          previousCursor: 'cursor-newer',
        },
      },
      unread_count: 1,
      filters: {
        page: 1,
        limit: 1,
        after: null,
        before: null,
        unread_only: false,
      },
    },
  })
}

describe('NotificationsPage', () => {
  afterEach(() => {
    cleanup()
    document.head.innerHTML = ''
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('renders cursor feed controls for newer and older windows', () => {
    renderNotificationsPage()

    expect(screen.getByRole('button', { name: /mới hơn/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /mới nhất/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cũ hơn/i })).toBeInTheDocument()
  })

  it('renders notification rows and marks an unread item as read without removing it', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    document.head.insertAdjacentHTML('beforeend', '<meta name="csrf-token" content="csrf-token-1">')

    renderNotificationsPage()

    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('First notification')).toBeInTheDocument()
    expect(screen.getAllByText('1')).toHaveLength(2)

    await fireEvent.click(screen.getByRole('button', { name: /^đã đọc$/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/notifications/notification-1/mark-as-read', {
        method: 'POST',
        headers: {
          'X-CSRF-TOKEN': 'csrf-token-1',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })
    })

    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^đã đọc$/i })).not.toBeInTheDocument()
    expect(screen.queryAllByText('1')).toHaveLength(0)
  })

  it('deletes an unread notification row after the owner confirms removal', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    document.head.insertAdjacentHTML('beforeend', '<meta name="csrf-token" content="csrf-token-1">')

    renderNotificationsPage()

    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getAllByText('1')).toHaveLength(2)

    await fireEvent.click(screen.getByRole('button', { name: /^xóa$/i }))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/notifications/notification-1', {
        method: 'DELETE',
        headers: {
          'X-CSRF-TOKEN': 'csrf-token-1',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })
    })

    expect(screen.queryByText('First')).not.toBeInTheDocument()
    expect(screen.queryByText('First notification')).not.toBeInTheDocument()
    expect(screen.queryAllByText('1')).toHaveLength(0)
    expect(screen.getByText('Không có thông báo nào')).toBeInTheDocument()
  })
})
