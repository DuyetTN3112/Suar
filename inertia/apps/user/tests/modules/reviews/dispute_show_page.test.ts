/* eslint-disable import-x/order */
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import EmptyStub from '../../shared/test_stubs/empty_stub.svelte'
import LinkStub from '../../shared/test_stubs/inertia_link_stub.svelte'

const { reloadSpy } = vi.hoisted(() => ({
  reloadSpy: vi.fn(),
}))

vi.mock('@inertiajs/svelte', () => ({
  Link: LinkStub,
  page: {
    props: {
      auth: {
        user: {
          current_organization_role: 'org_member',
        },
      },
    },
    url: '/reviews/disputes/dispute-1',
  },
  router: {
    reload: reloadSpy,
  },
}))

vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
  },
  AxiosError: class AxiosError extends Error {},
}))

vi.mock('@/apps/user/modules/reviews/disputes/components/dispute_detail_discussion_tab.svelte', () => ({
  default: EmptyStub,
}))

vi.mock('@/apps/user/modules/reviews/disputes/components/dispute_detail_evidence_tab.svelte', () => ({
  default: EmptyStub,
}))

vi.mock('@/apps/user/modules/reviews/disputes/components/dispute_detail_response_tab.svelte', () => ({
  default: EmptyStub,
}))

import axios from 'axios'
import DisputeShowPage from '@/apps/user/modules/reviews/disputes/show.svelte'

const mockedAxios = vi.mocked(axios)

function buildProps(overrides: Partial<{
  canRespond: boolean
  canReportToAdmin: boolean
  status: string
}> = {}) {
  return {
    dispute: {
      id: 'dispute-1',
      review_session_id: 'session-1',
      task_id: 'task-1',
      task_title: 'Review governance task',
      task_description: 'Dispute room for review package.',
      organization_id: 'org-1',
      project_id: 'project-1',
      reviewee_id: 'reviewee-1',
      reviewee_username: 'duyet',
      reviewee_email: 'duyet@example.com',
      status: overrides.status ?? 'collecting_evidence',
      dispute_reason: 'Need stronger justification from both sides.',
      requested_outcome: 'adjust_score',
      created_at: '2026-07-09T08:00:00.000Z',
      disputed_dimensions: {},
      disputed_skill_reviews: [],
      final_decision: null,
      final_rationale: null,
    },
    comments: [
      {
        id: 'discussion-1',
        author_id: 'reviewee-1',
        body: 'Please review my evidence again.',
        created_at: '2026-07-09T08:10:00.000Z',
        author_context: 'reviewee',
      },
    ],
    evidences: [
      {
        id: 'evidence-1',
        evidenceType: 'pull_request',
        url: 'https://example.com/pr/1',
        title: 'PR #1',
        description: 'Implementation proof',
        uploaded_by: 'reviewee-1',
        created_at: '2026-07-09T08:15:00.000Z',
      },
    ],
    taskComments: [
      {
        id: 'task-comment-1',
        taskId: 'task-1',
        authorId: 'peer-1',
        authorUsername: 'teammate',
        body: 'Original task comment for dossier.',
        visibility: 'internal',
        commentType: 'normal',
        reviewRelevance: false,
        parentCommentId: null,
        editedAt: null,
        createdAt: '2026-07-09T07:40:00.000Z',
        updatedAt: '2026-07-09T07:40:00.000Z',
        mentions: [],
      },
    ],
    authorContext: 'reviewee',
    canRespond: overrides.canRespond ?? true,
    canReportToAdmin: overrides.canReportToAdmin ?? false,
  }
}

describe('DisputeShowPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    reloadSpy.mockReset()
  })

  it('keeps report-to-admin locked until two-sided exchange requirement is satisfied', () => {
    render(DisputeShowPage, {
      props: buildProps({
        canRespond: true,
        canReportToAdmin: false,
      }),
    })

    expect(screen.getByText('Cần đủ 2 phía trong thảo luận.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Báo cáo lên admin' })).toBeDisabled()
  })

  it('reports dispute to admin from overview tab and reloads the room on success', async () => {
    mockedAxios.post.mockResolvedValue({ data: { data: { id: 'dispute-1', status: 'admin_reviewing' } } })

    render(DisputeShowPage, {
      props: buildProps({
        canRespond: true,
        canReportToAdmin: true,
      }),
    })

    await fireEvent.input(
      screen.getByPlaceholderText('Nêu ngắn gọn vì sao cần admin can thiệp...'),
      { target: { value: 'Need system admin decision' } }
    )

    await fireEvent.click(screen.getByRole('button', { name: 'Báo cáo lên admin' }))

    await waitFor(() => {
      expect(mockedAxios.post.mock.calls).toContainEqual([
        '/api/reviews/disputes/dispute-1/report',
        {
          escalationReason: 'Need system admin decision',
        },
      ])
    })

    await waitFor(() => {
      expect(reloadSpy.mock.calls).toContainEqual([])
    })

    expect(screen.getByText('Đã báo cáo tranh chấp lên admin hệ thống.')).toBeInTheDocument()
  })
})
