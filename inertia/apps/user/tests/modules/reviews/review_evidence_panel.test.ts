 
import { render, screen, waitFor } from '@testing-library/svelte'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const { axiosGetMock, axiosPostMock } = vi.hoisted(() => ({
  axiosGetMock: vi.fn(),
  axiosPostMock: vi.fn(),
}))

vi.mock('axios', () => ({
  default: {
    get: axiosGetMock,
    post: axiosPostMock,
  },
}))

vi.mock('@/apps/user/modules/reviews/components/review_related_task_comments_panel.svelte', () => ({
  default: () => ({
    $$render: () => '<div data-testid="related-task-comments">related comments stub</div>',
  }),
}))

import ReviewEvidencePanel from '@/apps/user/modules/reviews/components/review_evidence_panel.svelte'

describe('ReviewEvidencePanel', () => {
  beforeEach(() => {
    axiosGetMock.mockReset()
    axiosPostMock.mockReset()
  })

  it('loads evidence list with human-readable evidence labels', async () => {
    axiosGetMock.mockResolvedValue({
      data: {
        data: [
          {
            id: 'evidence-1',
            reviewSessionId: 'session-1',
            evidenceType: 'document_link',
            url: 'https://example.com/evidence',
            title: 'Design spec',
            description: 'Spec linked from review.',
            uploadedBy: 'user-1',
            createdAt: '2026-07-06T10:00:00.000Z',
            updatedAt: '2026-07-06T10:00:00.000Z',
          },
        ],
        pagination: {
          mode: 'offset',
          page: 2,
          perPage: 10,
          total: 24,
          lastPage: 3,
          hasNextPage: true,
          hasPreviousPage: true,
        },
      },
    })

    render(ReviewEvidencePanel, {
      props: {
        sessionId: 'session-1',
        taskId: 'task-1',
      },
    })

    await waitFor(() => {
      expect(axiosGetMock).toHaveBeenCalledWith('/reviews/session-1/evidences', {
        params: {
          page: 1,
          perPage: 10,
        },
      })
    })

    expect(await screen.findByText('Design spec')).toBeInTheDocument()
    expect(screen.getByText('11-20 / 24')).toBeInTheDocument()
    expect(screen.getByText('Tài liệu', { selector: 'p' })).toBeInTheDocument()
    expect(screen.queryByText('document_link')).not.toBeInTheDocument()
  })
})
