/* eslint-disable import-x/order */
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import LayoutStub from '../../shared/test_stubs/layout_stub.svelte'

const { postSpy, reloadSpy } = vi.hoisted(() => ({
  postSpy: vi.fn(),
  reloadSpy: vi.fn(),
}))

vi.mock('@inertiajs/svelte', () => ({
  router: {
    reload: reloadSpy,
    get: vi.fn(),
    visit: vi.fn(),
  },
}))

vi.mock('@/apps/admin/shared/layouts/app_layout.svelte', () => ({
  default: LayoutStub,
}))

vi.mock('axios', () => ({
  default: {
    post: postSpy,
  },
  AxiosError: class AxiosError extends Error {},
}))

import AdminDisputeShowPage from '@/apps/admin/modules/disputes/show.svelte'

describe('AdminDisputeShowPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    postSpy.mockResolvedValue({ data: {} })
  })

  it('surfaces latest admin dossier across overview, evidence, and resolve tabs', async () => {
    render(AdminDisputeShowPage, {
      props: {
        dispute: {
          id: 'dispute-1',
          review_session_id: 'session-1',
          task_id: 'task-1',
          task_title: 'Review governance task',
          task_description: 'Task already escalated to admin.',
          organization_id: 'org-1',
          project_id: 'project-1',
          reviewee_id: 'user-1',
          reviewee_username: 'duyet',
          reviewee_email: 'duyet@example.com',
          status: 'admin_reviewing',
          dispute_reason: 'Need full dossier before resolution.',
          requested_outcome: 'adjust_score',
          created_at: '2026-07-09T08:00:00.000Z',
          disputed_dimensions: {},
          disputed_skill_reviews: [],
          final_decision: null,
          final_rationale: null,
          review_session_status: 'disputed',
        },
        comments: [
          {
            id: 'comment-1',
            author_id: 'user-1',
            body: 'Please re-check rubric weighting.',
            created_at: '2026-07-09T08:10:00.000Z',
            author_context: 'reviewee',
            author_system_role: null,
          },
        ],
        evidences: [
          {
            id: 'evidence-1',
            evidenceType: 'link',
            url: 'https://example.com/evidence',
            title: 'Live demo',
            description: 'Demo evidence',
            uploaded_by: 'user-1',
            created_at: '2026-07-09T08:05:00.000Z',
          },
        ],
        case_files: [
          {
            id: 'case-file-2',
            case_version: 3,
            completeness_score: 92,
            missing_data: ['none'],
            created_at: '2026-07-09T09:00:00.000Z',
            task_comments_snapshot: [
              {
                body: 'Task comment included in dossier.',
                author_id: 'peer-1',
                comment_type: 'comment',
                review_relevance: true,
                created_at: '2026-07-09T07:50:00.000Z',
              },
            ],
            evidences_snapshot: [
              {
                title: 'Live demo',
                evidence_type: 'link',
              },
            ],
            dispute_claim_snapshot: {
              dispute_reason: 'Need full dossier before resolution.',
              requested_outcome: 'adjust_score',
              dispute_comments: [
                {
                  body: 'Admin needs both sides.',
                  author_context: 'admin',
                },
              ],
            },
          },
        ],
        ai_evaluations: [
          {
            id: 'ai-1',
            provider: 'ai_council',
            status: 'completed',
            recommendation: 'adjust_score',
            confidence_score: 0.82,
            summary: 'AI suggests a narrow adjustment.',
            completed_at: '2026-07-09T09:05:00.000Z',
          },
        ],
        timeline: [
          {
            id: 'timeline-1',
            kind: 'case_file',
            action: 'build_review_dispute_case_file',
            occurred_at: '2026-07-09T09:00:00.000Z',
            actor_id: 'admin-1',
            actor_label: 'admin',
            summary: 'Built dossier snapshot.',
            metadata: {},
          },
        ],
      },
    })

    expect(screen.getByText('Admin dossier mới nhất')).toBeInTheDocument()
    expect(screen.getByText('Case file v3')).toBeInTheDocument()
    expect(screen.getByText('92% complete')).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('tab', { name: 'Minh chứng' }))
    expect(screen.getByText('Snapshot evidence trong dossier')).toBeInTheDocument()
    expect(screen.getAllByText('Live demo')).toHaveLength(2)

    await fireEvent.click(screen.getByRole('tab', { name: 'Xử lý' }))
    expect(screen.getAllByText('adjust_score').length).toBeGreaterThan(0)
    expect(screen.getAllByText('AI suggests a narrow adjustment.').length).toBeGreaterThan(0)
    expect(screen.getByText('Độ tin cậy: 82%')).toBeInTheDocument()
    expect(screen.getByText('Comment task đưa vào hồ sơ')).toBeInTheDocument()
    expect(screen.getByText('Task comment included in dossier.')).toBeInTheDocument()
    expect(screen.getByText('Trao đổi tranh chấp trong hồ sơ')).toBeInTheDocument()
    expect(screen.getByText('Admin needs both sides.')).toBeInTheDocument()
  })

  it('passes sourceType when starting AI and resolving sprint disputes without a case file', async () => {
    render(AdminDisputeShowPage, {
      props: {
        dispute: {
          id: 'sprint-dispute-1',
          review_session_id: null,
          task_id: null,
          task_title: null,
          task_description: null,
          organization_id: 'org-1',
          project_id: 'project-1',
          reviewee_id: 'reviewer-1',
          reviewee_username: 'manager',
          reviewee_email: 'manager@example.com',
          status: 'reported',
          source_type: 'sprint_review_dispute',
          dispute_review_type: 'manager_review',
          dispute_reason: 'Manager review conflicts with sprint record.',
          requested_outcome: 'request_admin_review',
          created_at: '2026-07-09T08:00:00.000Z',
          disputed_dimensions: {},
          disputed_skill_reviews: [],
          final_decision: null,
          final_rationale: null,
          review_session_status: null,
          runtime_context: {
            organization: { id: 'org-1', name: 'Acme Ops' },
            project: { id: 'project-1', name: 'Project Mercury' },
            sprint: { id: 'sprint-1', name: 'Sprint 7' },
            sprint_peer_tasks: [{ id: 'task-peer-1', title: 'Peer task in same sprint' }],
            manager_reviews: [{ reviewer_id: 'manager-1' }],
            environment_reviews: [],
          },
        },
        comments: [],
        evidences: [],
        case_files: [],
        ai_evaluations: [],
        timeline: [],
      },
    })

    await fireEvent.click(screen.getByRole('tab', { name: 'Xử lý' }))
    expect(screen.getAllByText('Runtime context').length).toBeGreaterThan(0)

    await fireEvent.click(screen.getByRole('button', { name: 'Gọi AI' }))
    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        '/api/admin/reviews/disputes/sprint-dispute-1/ai-evaluations',
        {
          provider: 'ai_council',
          sourceType: 'sprint_review_dispute',
        }
      )
    })

    await fireEvent.input(screen.getByLabelText(/Giải trình quyết định/), {
      target: { value: 'Sprint context supports partial acceptance.' },
    })
    const resolveButton = screen.getByRole('button', { name: 'Ban hành quyết định' })
    expect(resolveButton).not.toBeDisabled()

    await fireEvent.click(resolveButton)
    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        '/api/admin/reviews/disputes/sprint-dispute-1/resolve',
        expect.objectContaining({
          finalDecision: 'dismiss_dispute',
          finalRationale: 'Sprint context supports partial acceptance.',
          sourceType: 'sprint_review_dispute',
        })
      )
    })
  })

  it('passes taskReviewWorkflow sourceType when starting AI and resolving without a case file', async () => {
    render(AdminDisputeShowPage, {
      props: {
        dispute: {
          id: 'task-workflow-1',
          review_session_id: null,
          task_id: 'task-1',
          task_title: 'Task under disputed review',
          task_description: null,
          organization_id: 'org-1',
          project_id: 'project-1',
          reviewee_id: 'worker-1',
          reviewee_username: 'worker',
          reviewee_email: 'worker@example.com',
          status: 'reported',
          source_type: 'task_review_workflow',
          dispute_review_type: 'task_review',
          dispute_reason: 'Task review missed peer task evidence.',
          requested_outcome: 'request_admin_review',
          created_at: '2026-07-09T08:00:00.000Z',
          disputed_dimensions: {},
          disputed_skill_reviews: [],
          final_decision: null,
          final_rationale: null,
          review_session_status: null,
          runtime_context: {
            organization: { id: 'org-1', name: 'Acme Ops' },
            project: { id: 'project-1', name: 'Project Mercury' },
            sprint: { id: 'sprint-1', name: 'Sprint 7' },
            task: { id: 'task-1', title: 'Task under disputed review' },
            sprint_peer_tasks: [{ id: 'task-peer-1', title: 'Peer task in same project' }],
            task_giver_context: { profile: { username: 'manager' } },
            reviewee_context: { profile: { username: 'worker' } },
          },
        },
        comments: [],
        evidences: [],
        case_files: [],
        ai_evaluations: [],
        timeline: [],
      },
    })

    await fireEvent.click(screen.getByRole('tab', { name: 'Xử lý' }))
    expect(screen.getAllByText('Runtime context').length).toBeGreaterThan(0)
    expect(screen.getByText('Task review workflow')).toBeInTheDocument()

    await fireEvent.click(screen.getByRole('button', { name: 'Gọi AI' }))
    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        '/api/admin/reviews/disputes/task-workflow-1/ai-evaluations',
        {
          provider: 'ai_council',
          sourceType: 'task_review_workflow',
        }
      )
    })

    await fireEvent.input(screen.getByLabelText(/Giải trình quyết định/), {
      target: { value: 'Task workflow context supports resolving this dispute.' },
    })
    const resolveButton = screen.getByRole('button', { name: 'Ban hành quyết định' })
    expect(resolveButton).not.toBeDisabled()

    await fireEvent.click(resolveButton)
    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        '/api/admin/reviews/disputes/task-workflow-1/resolve',
        expect.objectContaining({
          finalDecision: 'dismiss_dispute',
          finalRationale: 'Task workflow context supports resolving this dispute.',
          sourceType: 'task_review_workflow',
        })
      )
    })
  })
})
