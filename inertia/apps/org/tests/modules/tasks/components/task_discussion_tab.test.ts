import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('axios')

import TaskDiscussionTab from '@/apps/org/modules/tasks/components/detail/task_discussion_tab.svelte'

const mockedAxios = vi.mocked(axios)

describe('TaskDiscussionTab', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedAxios.get.mockResolvedValue({
      data: {
        data: [],
        pagination: {
          mode: 'offset',
          page: 1,
          perPage: 10,
          total: 0,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          nextCursor: null,
          previousCursor: null,
        },
      },
    })
    mockedAxios.post.mockResolvedValue({
      data: {
        data: {
          id: 'comment-1',
        },
      },
    })
  })

  it('submits plain task comments without exposing review note controls', async () => {
    render(TaskDiscussionTab, {
      props: {
        taskId: 'task-1',
        currentUserId: 'user-1',
      },
    })

    await waitFor(() => {
      expect(mockedAxios.get.mock.calls[0]).toEqual(['/api/v1/tasks/task-1/comments', {
        params: {
          page: 1,
          perPage: 10,
        },
      }])
    })

    expect(screen.queryByLabelText('Loại bình luận')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Gắn nhãn đây là review note nội bộ')).not.toBeInTheDocument()
    await fireEvent.input(
      screen.getByPlaceholderText('Ghi chú tiến độ, câu hỏi, quyết định kỹ thuật... Dùng @username để tag.'),
      {
        target: { value: 'Đây là note cho review cuối task' },
      }
    )

    await fireEvent.click(screen.getByRole('button', { name: 'Gửi bình luận' }))

    await waitFor(() => {
      expect(mockedAxios.post.mock.calls[0]).toEqual(['/api/v1/tasks/task-1/comments', {
        parentCommentId: null,
        body: 'Đây là note cho review cuối task',
        commentType: 'normal',
        visibility: 'internal',
        reviewRelevance: false,
      }])
    })
  })

  it('renders replies nested under parent comments with parent preview context', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: {
        data: [
          {
            id: 'comment-parent',
            authorId: 'user-1',
            authorUsername: 'duyet',
            parentCommentId: null,
            body: 'Comment gốc để bàn hướng xử lý.',
            visibility: 'internal',
            commentType: 'normal',
            reviewRelevance: false,
            createdAt: '2026-07-09T10:00:00.000Z',
            mentions: [],
          },
          {
            id: 'comment-reply',
            authorId: 'user-2',
            authorUsername: 'teammate',
            parentCommentId: 'comment-parent',
            body: 'Mình đồng ý, thêm benchmark nữa là đủ.',
            visibility: 'internal',
            commentType: 'clarification',
            reviewRelevance: true,
            createdAt: '2026-07-09T11:00:00.000Z',
            mentions: [],
          },
        ],
        pagination: {
          mode: 'offset',
          page: 1,
          perPage: 10,
          total: 1,
          lastPage: 1,
          hasNextPage: false,
          hasPreviousPage: false,
          nextCursor: null,
          previousCursor: null,
        },
      },
    })

    render(TaskDiscussionTab, {
      props: {
        taskId: 'task-1',
        currentUserId: 'user-1',
      },
    })

    await waitFor(() => {
      expect(screen.getByTestId('task-comment-comment-parent')).toBeInTheDocument()
    })

    const parentCard = screen.getByTestId('task-comment-comment-parent')
    const replyCard = screen.getByTestId('task-comment-comment-reply')

    expect(parentCard).toContainElement(replyCard)
    expect(screen.getByText('Đang trả lời: Comment gốc để bàn hướng xử lý.')).toBeInTheDocument()
    expect(screen.getByText('Mình đồng ý, thêm benchmark nữa là đủ.')).toBeInTheDocument()
  })

  it('requests paginated root threads and lets the user move between pages', async () => {
    mockedAxios.get
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 'comment-page-1',
              authorId: 'user-1',
              authorUsername: 'duyet',
              parentCommentId: null,
              body: 'Root thread page 1',
              visibility: 'internal',
              commentType: 'normal',
              reviewRelevance: false,
              createdAt: '2026-07-09T10:00:00.000Z',
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
              id: 'comment-page-2',
              authorId: 'user-2',
              authorUsername: 'teammate',
              parentCommentId: null,
              body: 'Root thread page 2',
              visibility: 'internal',
              commentType: 'clarification',
              reviewRelevance: true,
              createdAt: '2026-07-09T11:00:00.000Z',
              mentions: [],
            },
            {
              id: 'comment-page-2-reply',
              authorId: 'user-1',
              authorUsername: 'duyet',
              parentCommentId: 'comment-page-2',
              body: 'Reply stays with thread 2',
              visibility: 'internal',
              commentType: 'normal',
              reviewRelevance: false,
              createdAt: '2026-07-09T11:05:00.000Z',
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

    render(TaskDiscussionTab, {
      props: {
        taskId: 'task-1',
        currentUserId: 'user-1',
      },
    })

    await waitFor(() => {
      expect(mockedAxios.get.mock.calls[0]).toEqual(['/api/v1/tasks/task-1/comments', {
        params: {
          page: 1,
          perPage: 10,
        },
      }])
    })

    expect(screen.getByText('1-1 / 2')).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: /next page/i }))

    await waitFor(() => {
      expect(mockedAxios.get.mock.calls[1]).toEqual(['/api/v1/tasks/task-1/comments', {
        params: {
          page: 2,
          perPage: 10,
        },
      }])
    })

    expect(screen.getByText('Root thread page 2')).toBeInTheDocument()
    expect(screen.getByText('Reply stays with thread 2')).toBeInTheDocument()
    expect(screen.getByText('2-2 / 2')).toBeInTheDocument()
  })
})
