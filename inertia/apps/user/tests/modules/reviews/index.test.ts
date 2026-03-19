import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import type { SerializedReviewSession } from '@/apps/user/modules/reviews/types.svelte'
import UserReviewsPage from '@/apps/user/modules/reviews/user-reviews.svelte'

vi.mock('@/apps/user/shared/layouts/app_layout.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

vi.mock('@/apps/user/shared/layouts/organization_layout.svelte', async () => {
  const stubModule = await import('../../shared/test_stubs/layout_stub.svelte')
  return { default: stubModule.default }
})

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
  },
}))

describe('UserReviewsPage', () => {
  it('builds pagination links with concrete user id', () => {
    render(UserReviewsPage, {
      props: {
        userId: 'user-42',
        reviews: [
          {
            id: 'review-1',
            task_assignment_id: 'assignment-1',
            status: 'completed',
            reviewee_id: 'user-42',
            manager_review_completed: true,
            peer_reviews_count: 1,
            required_peer_reviews: 1,
            confirmations: [],
            created_at: '2026-07-05T12:00:00.000Z',
            completed_at: '2026-07-05T12:00:00.000Z',
            updated_at: '2026-07-05T12:00:00.000Z',
            task_assignment: {
              id: 'assignment-1',
              task: {
                id: 'task-1',
                title: 'Pagination audit',
                project_id: 'project-1',
              },
            },
            reviewee: {
              id: 'user-42',
              username: 'Duyet',
              email: 'duyet@example.com',
            },
          } satisfies SerializedReviewSession,
        ],
        pagination: {
          mode: 'offset',
          total: 25,
          perPage: 20,
          page: 2,
          lastPage: 2,
          hasNextPage: false,
          hasPreviousPage: true,
        },
      },
    })

    expect(screen.getByRole('link', { name: /trang trước/i })).toHaveAttribute(
      'href',
      '/users/user-42/reviews?page=1'
    )
  })
})
