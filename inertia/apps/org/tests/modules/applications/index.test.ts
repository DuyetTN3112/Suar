import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { afterEach, describe, expect, it, vi } from 'vitest'

import OrgApplicationsPage from '@/apps/org/modules/applications/index.svelte'

const inertiaMocks = vi.hoisted(() => ({
  router: {
    visit: vi.fn(),
  },
}))

vi.mock('@inertiajs/svelte', () => ({
  router: inertiaMocks.router,
}))

vi.mock('@/apps/org/shared/layouts/organization_layout.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

const pendingApplication = {
  id: 'application-1',
  task_id: 'task-1',
  task: {
    id: 'task-1',
    title: 'Audit application queue',
    status: 'published',
  },
  user: {
    id: 'user-1',
    username: 'duyet',
    email: 'duyet@example.test',
  },
  status: 'pending' as const,
  cover_letter: 'I can help with the review.',
  portfolio_links: ['https://portfolio.example.test/private-work'],
  created_at: '2026-07-26T10:00:00.000Z',
  candidate_source: 'external',
}

const secondPendingApplication = {
  ...pendingApplication,
  id: 'application-2',
  user: {
    id: 'user-2',
    username: 'private-reviewer',
    email: 'private-reviewer@example.test',
  },
  cover_letter: 'This private note should stay on the ranked comparison page.',
  created_at: '2026-07-27T11:00:00.000Z',
}

function renderPage() {
  render(OrgApplicationsPage, {
    props: {
      applications: [pendingApplication, secondPendingApplication],
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

describe('OrgApplicationsPage', () => {
  afterEach(() => {
    cleanup()
    document.head.innerHTML = ''
    vi.clearAllMocks()
  })

  it('opens task-specific application review inside the org shell', async () => {
    renderPage()

    expect(screen.getByText('Audit application queue')).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'Xem ứng viên' }))

    await waitFor(() => {
      expect(inertiaMocks.router.visit).toHaveBeenCalledWith('/org/tasks/task-1/applications')
    })
  })

  it('groups organization applications by task before revealing applicant-private data', () => {
    renderPage()

    expect(screen.getAllByText('Audit application queue')).toHaveLength(1)
    expect(screen.getByText(/2 pending applications|2 đề xuất đang chờ/)).toBeInTheDocument()
    expect(screen.getByText(/Newest application|Đề xuất mới nhất/)).toBeInTheDocument()
    expect(screen.queryByText('duyet')).not.toBeInTheDocument()
    expect(screen.queryByText('duyet@example.test')).not.toBeInTheDocument()
    expect(screen.queryByText('private-reviewer')).not.toBeInTheDocument()
    expect(screen.queryByText('private-reviewer@example.test')).not.toBeInTheDocument()
    expect(screen.queryByText('I can help with the review.')).not.toBeInTheDocument()
    expect(
      screen.queryByText('This private note should stay on the ranked comparison page.')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('https://portfolio.example.test/private-work')
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /portfolio/i })).not.toBeInTheDocument()
  })
})
