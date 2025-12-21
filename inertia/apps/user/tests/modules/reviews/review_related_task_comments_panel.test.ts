import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}))

import ReviewRelatedTaskCommentsPanel from '@/apps/user/modules/reviews/components/review_related_task_comments_panel.svelte'

const mockedAxios = vi.mocked(axios)

describe('ReviewRelatedTaskCommentsPanel', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('renders replies nested under parent comments with parent preview context', () => {
    render(ReviewRelatedTaskCommentsPanel, {
      props: {
        taskId: 'task-1',
        mode: 'all',
        perPage: 1,
        initialComments: [
          {
            id: 'comment-parent',
            taskId: 'task-1',
            parentCommentId: null,
            authorId: 'user-1',
            authorUsername: 'duyet',
            body: 'Comment gốc trong package review.',
            commentType: 'review_note',
            visibility: 'internal',
            reviewRelevance: true,
            editedAt: null,
            createdAt: '2026-07-09T10:00:00.000Z',
            updatedAt: '2026-07-09T10:00:00.000Z',
            mentions: [],
          },
          {
            id: 'comment-reply',
            taskId: 'task-1',
            parentCommentId: 'comment-parent',
            authorId: 'user-2',
            authorUsername: 'teammate',
            body: 'Reply này cần được thấy trong dispute evidence.',
            commentType: 'clarification',
            visibility: 'internal',
            reviewRelevance: true,
            editedAt: null,
            createdAt: '2026-07-09T11:00:00.000Z',
            updatedAt: '2026-07-09T11:00:00.000Z',
            mentions: [],
          },
        ],
      },
    })

    const parentCard = screen.getByTestId('review-task-comment-comment-parent')
    const replyCard = screen.getByTestId('review-task-comment-comment-reply')

    expect(parentCard).toContainElement(replyCard)
    expect(screen.getByText('Đang trả lời: Comment gốc trong package review.')).toBeInTheDocument()
    expect(screen.getByText('Reply này cần được thấy trong dispute evidence.')).toBeInTheDocument()
    expect(screen.queryByText(/review note/i)).not.toBeInTheDocument()
  })

  it('requests paginated remote task comments and moves between root-thread pages', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'root-page-1',
              taskId: 'task-1',
              parentCommentId: null,
              authorId: 'user-1',
              authorUsername: 'duyet',
              body: 'Remote root page 1',
              commentType: 'normal',
              visibility: 'internal',
              reviewRelevance: true,
              editedAt: null,
              createdAt: '2026-07-09T10:00:00.000Z',
              updatedAt: '2026-07-09T10:00:00.000Z',
              mentions: [],
            },
          ],
          pagination: {
            mode: 'offset',
            page: 1,
            perPage: 1,
            total: 2,
            lastPage: 2,
            hasNextPage: true,
            hasPreviousPage: false,
            nextCursor: null,
            previousCursor: null,
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'root-page-2',
              taskId: 'task-1',
              parentCommentId: null,
              authorId: 'user-2',
              authorUsername: 'teammate',
              body: 'Remote root page 2',
              commentType: 'review_note',
              visibility: 'internal',
              reviewRelevance: true,
              editedAt: null,
              createdAt: '2026-07-09T11:00:00.000Z',
              updatedAt: '2026-07-09T11:00:00.000Z',
              mentions: [],
            },
            {
              id: 'reply-page-2',
              taskId: 'task-1',
              parentCommentId: 'root-page-2',
              authorId: 'user-1',
              authorUsername: 'duyet',
              body: 'Remote reply page 2',
              commentType: 'clarification',
              visibility: 'internal',
              reviewRelevance: true,
              editedAt: null,
              createdAt: '2026-07-09T11:05:00.000Z',
              updatedAt: '2026-07-09T11:05:00.000Z',
              mentions: [],
            },
          ],
          pagination: {
            mode: 'offset',
            page: 2,
            perPage: 1,
            total: 2,
            lastPage: 2,
            hasNextPage: false,
            hasPreviousPage: true,
            nextCursor: null,
            previousCursor: null,
          },
        },
      })

    render(ReviewRelatedTaskCommentsPanel, {
      props: {
        taskId: 'task-1',
        mode: 'all',
        perPage: 1,
        initialComments: [],
      },
    })

    await waitFor(() => {
      expect(mockedAxios.get.mock.calls[0]).toEqual([
        '/api/v1/tasks/task-1/comments',
        {
          params: {
            page: 1,
            perPage: 1,
          },
        },
      ])
    })

    expect(screen.getByText('1-1 / 2')).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: /next page/i }))

    await waitFor(() => {
      expect(mockedAxios.get.mock.calls[1]).toEqual([
        '/api/v1/tasks/task-1/comments',
        {
          params: {
            page: 2,
            perPage: 1,
          },
        },
      ])
    })

    expect(screen.getByText('Remote root page 2')).toBeInTheDocument()
    expect(screen.getByText('Remote reply page 2')).toBeInTheDocument()
    expect(screen.getByText('2-2 / 2')).toBeInTheDocument()
  })
})
