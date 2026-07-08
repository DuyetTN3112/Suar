import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import DisputeDetailDiscussionTab from '@/apps/user/modules/reviews/disputes/components/dispute_detail_discussion_tab.svelte'

describe('DisputeDetailDiscussionTab', () => {
  it('shows dispute exchange counters separately from task comments', () => {
    render(DisputeDetailDiscussionTab, {
      props: {
        comments: [],
        disputeStatus: 'collecting_evidence',
        commentBody: '',
        postingComment: false,
        onPostComment: vi.fn(),
        taskCommentCount: 5,
      },
    })

    expect(screen.getByText('5 task comments')).toBeInTheDocument()
    expect(screen.getByText('2 phía trước report')).toBeInTheDocument()
    expect(screen.getByText('Chưa có lượt trao đổi nào giữa hai bên.')).toBeInTheDocument()
  })

  it('paginates long dispute exchanges', () => {
    render(DisputeDetailDiscussionTab, {
      props: {
        comments: Array.from({ length: 11 }, (_, index) => ({
          id: `comment-${index + 1}`,
          author_id: `user-${index + 1}`,
          body: `Dispute comment ${index + 1}`,
          created_at: '2026-07-09T10:00:00.000Z',
          author_context: 'reviewee',
        })),
        disputeStatus: 'collecting_evidence',
        commentBody: '',
        postingComment: false,
        onPostComment: vi.fn(),
        taskCommentCount: 0,
      },
    })

    expect(screen.getByText('1-10 / 11')).toBeInTheDocument()
    expect(screen.getByText('Dispute comment 1')).toBeInTheDocument()
    expect(screen.queryByText('Dispute comment 11')).not.toBeInTheDocument()
  })
})
