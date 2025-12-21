import { render, screen, waitFor } from '@testing-library/svelte'
import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import PendingSprintReviewPackages from '@/apps/user/modules/reviews/components/pending_sprint_review_packages.svelte'

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const mockedAxios = vi.mocked(axios)

describe('PendingSprintReviewPackages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders submitted package history as read-only review details', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'package-1',
              sprintId: 'sprint-1',
              status: 'submitted',
              sprintName: 'Sprint History',
              projectName: 'Governance Project',
              organizationId: 'org-1',
              submittedAt: '2026-07-14T02:00:00.000Z',
            },
          ],
          pagination: {
            mode: 'offset',
            page: 2,
            perPage: 10,
            total: 21,
            lastPage: 3,
            hasNextPage: true,
            hasPreviousPage: true,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            id: 'package-1',
            sprintId: 'sprint-1',
            status: 'submitted',
            projectTarget: { id: 'project-1', name: 'Governance Project' },
            organizationTarget: { id: 'org-1', name: 'Suar Org' },
            eligibleManagerTargets: [],
            managerReviews: [
              {
                id: 'manager-review-1',
                targetUserId: 'owner-1',
                targetRole: 'owner',
                rating: 5,
                comment: 'Clear direction.',
              },
            ],
            environmentReviews: [
              {
                id: 'environment-review-1',
                targetType: 'project',
                targetId: 'project-1',
                rating: 4,
                comment: 'Stable project flow.',
              },
            ],
            dispute: {
              id: 'sprint-dispute-1',
              status: 'pending',
              disputeReason: 'Environment score needs context.',
              requestedOutcome: 'add_context',
              canReportToAdmin: true,
              comments: [
                {
                  id: 'comment-1',
                  authorId: 'reviewer-1',
                  authorContext: 'reviewer',
                  body: 'Project support was lower than reflected.',
                  createdAt: '2026-07-14T03:00:00.000Z',
                },
                {
                  id: 'comment-2',
                  authorId: 'owner-1',
                  authorContext: 'org_representative',
                  body: 'Org side can add sprint context.',
                  createdAt: '2026-07-14T03:05:00.000Z',
                },
              ],
            },
          },
        },
      })

    render(PendingSprintReviewPackages)

    await waitFor(() =>
      expect(mockedAxios.get.mock.calls).toContainEqual([
        '/api/v1/me/sprint-review-packages',
        {
          params: { page: 1, perPage: 10 },
        },
      ])
    )
    await waitFor(() => expect(screen.getByText('Sprint History')).toBeInTheDocument())

    expect(screen.getByText('11-20 / 21')).toBeInTheDocument()
    expect(screen.getAllByText('Submitted').length).toBeGreaterThan(0)
    expect(screen.getByText('Clear direction.')).toBeInTheDocument()
    expect(screen.getByText('Stable project flow.')).toBeInTheDocument()
    expect(screen.getByText('Sprint review dispute')).toBeInTheDocument()
    expect(screen.getByText('Project support was lower than reflected.')).toBeInTheDocument()
    expect(screen.getByText('Org side can add sprint context.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Report to admin' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Submit sprint review' })).not.toBeInTheDocument()
  })
})
