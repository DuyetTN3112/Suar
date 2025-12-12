/* eslint-disable import-x/order */
import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import LayoutStub from '../../shared/test_stubs/layout_stub.svelte'
import LinkStub from '../../shared/test_stubs/inertia_link_stub.svelte'

vi.mock('@/apps/org/shared/layouts/organization_layout.svelte', () => ({
  default: LayoutStub,
}))

vi.mock('@inertiajs/svelte', () => ({
  Link: LinkStub,
  router: {
    get: vi.fn(),
    visit: vi.fn(),
    reload: vi.fn(),
  },
}))

import OrgDisputesPage from '@/apps/org/modules/disputes/index.svelte'

describe('OrgDisputesPage', () => {
  it('preserves org dispute filters in pagination links', () => {
    render(OrgDisputesPage, {
      props: {
        disputes: [
          {
            id: 'dispute-1',
            review_session_id: 'session-1',
            task_id: 'task-1',
            task_title: 'Audit queue',
            reviewee_id: 'user-1',
            reviewee_username: 'duyet',
            status: 'pending',
            dispute_reason: 'Need review',
            requested_outcome: 'recheck',
            created_at: '2026-07-05T12:00:00.000Z',
            comments_count: 1,
            evidences_count: 2,
          },
        ],
        pagination: {
          mode: 'cursor',
          total: 25,
          perPage: 20,
          page: 1,
          lastPage: 2,
          hasNextPage: true,
          hasPreviousPage: true,
          cursor: {
            nextCursor: 'cursor-older',
            previousCursor: 'cursor-newer',
          },
        },
        filters: {
          search: 'duyet',
          status: 'pending',
          after: null,
        },
      },
    })

    expect(screen.getByRole('link', { name: /mới hơn/i })).toHaveAttribute(
      'href',
      '/org/disputes?status=pending&search=duyet&before=cursor-newer'
    )
    expect(screen.getByRole('link', { name: /cũ hơn/i })).toHaveAttribute(
      'href',
      '/org/disputes?status=pending&search=duyet&after=cursor-older'
    )
  })

  it('shows human-readable dispute queue rows without leaking raw ids', () => {
    render(OrgDisputesPage, {
      props: {
        disputes: [
          {
            id: '31b0cb2d-b665-4dc1-a145-a7db236f8d9a',
            review_session_id: 'f53d8dc0-c5b1-46c1-b3f5-984decb528fe',
            task_id: '341de8c8-6af5-49aa-b317-47ea4e6f84b6',
            task_title: 'Queue review evidence',
            reviewee_id: 'd825272a-f22e-4cd4-b3fe-d2d8b55c4b62',
            reviewee_username: 'duyet',
            status: 'pending',
            dispute_reason: 'Clarify evidence trail.',
            requested_outcome: 'clarify_evidence',
            created_at: '2026-07-05T12:00:00.000Z',
            comments_count: 1,
            evidences_count: 2,
          },
        ],
        pagination: {
          mode: 'cursor',
          total: 1,
          perPage: 20,
          page: 1,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          cursor: {
            nextCursor: null,
            previousCursor: null,
          },
        },
        filters: {
          search: null,
          status: null,
          after: null,
        },
      },
    })

    expect(screen.getByText('duyet')).toBeInTheDocument()
    expect(screen.getByText('Làm rõ minh chứng')).toBeInTheDocument()
    expect(screen.getByText('Chờ xử lý', { selector: 'span' })).toBeInTheDocument()
    expect(screen.queryByText('clarify_evidence')).not.toBeInTheDocument()
    expect(screen.queryByText('d825272a-f22e-4cd4-b3fe-d2d8b55c4b62')).not.toBeInTheDocument()
    expect(screen.queryByText('f53d8dc0-c5b1-46c1-b3f5-984decb528fe')).not.toBeInTheDocument()
    expect(screen.queryByText('31b0cb2d-b665-4dc1-a145-a7db236f8d9a')).not.toBeInTheDocument()
  })
})
