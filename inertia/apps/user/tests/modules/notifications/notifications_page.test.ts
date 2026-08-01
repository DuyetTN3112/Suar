import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import NotificationsPage from '@/apps/user/modules/notifications/index.svelte'

const routerMock = vi.hoisted(() => ({
  get: vi.fn(),
  visit: vi.fn(),
}))

vi.mock('@/apps/user/shared/layouts/app_layout.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/shared/layouts/organization_layout.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@inertiajs/svelte', () => ({
  router: routerMock,
  page: {
    props: {
      auth: {
        user: {
          current_organization_role: null,
        },
      },
    },
  },
}))

interface TestNotificationItem {
  id: string
  type: string
  title: string
  message: string
  related_entity_type: string | null
  related_entity_id: string | null
  read_at: string | null
  created_at: string
  data?: Record<string, unknown>
}

const unreadNotification: TestNotificationItem = {
  id: 'notification-1',
  type: 'info',
  title: 'First',
  message: 'First notification',
  related_entity_type: null,
  related_entity_id: null,
  read_at: null,
  created_at: '2026-07-05T12:00:00.000Z',
}

function renderNotificationsPage(
  notifications = [unreadNotification],
  shellMode: 'app' | 'organization' = 'app'
) {
  render(NotificationsPage, {
    props: {
      shellMode,
      notifications,
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

  it('renders a future catalog type with the safe default icon path', () => {
    renderNotificationsPage([{ ...unreadNotification, type: 'future_catalog_type' }])

    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('First notification')).toBeInTheDocument()
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

  it('keeps organization-shell inbox navigation and deep links inside /org', async () => {
    renderNotificationsPage(
      [
        {
          ...unreadNotification,
          type: 'task_updated',
          related_entity_type: 'task',
          related_entity_id: 'task-1',
          data: { project_id: 'project-1' },
        },
      ],
      'organization'
    )

    await fireEvent.click(screen.getByRole('button', { name: /mới hơn/i }))

    expect(routerMock.get).toHaveBeenCalledWith(
      '/org/notifications',
      {
        before: 'cursor-newer',
        unread_only: false,
      },
      {
        preserveState: false,
        preserveScroll: true,
      }
    )

    await fireEvent.click(screen.getByText('First'))

    expect(routerMock.visit).toHaveBeenCalledWith('/projects/project-1/tasks?task_id=task-1')
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

  it('does not mark a notification locally when the server rejects the mutation', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 500 })))

    renderNotificationsPage()
    await fireEvent.click(screen.getByRole('button', { name: /^đã đọc$/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/không thể cập nhật thông báo/i)
    })
    expect(screen.getByRole('button', { name: /^đã đọc$/i })).toBeInTheDocument()
    expect(screen.getAllByText('1')).toHaveLength(2)
  })

  it('does not remove a notification locally when the server rejects deletion', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })))

    renderNotificationsPage()
    await fireEvent.click(screen.getByRole('button', { name: /^xóa$/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/không thể cập nhật thông báo/i)
    })
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getAllByText('1')).toHaveLength(2)
  })

  it('does not mark all notifications locally when the server rejects the mutation', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 429 })))

    renderNotificationsPage()
    await fireEvent.click(screen.getByRole('button', { name: /đánh dấu tất cả đã đọc/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/không thể cập nhật thông báo/i)
    })
    expect(screen.getByRole('button', { name: /^đã đọc$/i })).toBeInTheDocument()
    expect(screen.getAllByText('1')).toHaveLength(2)
  })
})
