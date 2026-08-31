import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import AdminDisputeShowPage from '@/apps/admin/modules/disputes/show.svelte'

const { getSpy, postSpy, reloadSpy } = vi.hoisted(() => ({
  getSpy: vi.fn(),
  postSpy: vi.fn(),
  reloadSpy: vi.fn(),
}))

vi.mock('@inertiajs/svelte', () => ({
  router: { reload: reloadSpy, get: vi.fn(), visit: vi.fn() },
}))

vi.mock('axios', () => ({
  default: { get: getSpy, post: postSpy },
  AxiosError: class AxiosError extends Error {},
}))

function renderDetail(
  aiEvaluations = [
    {
      id: 'ai-1',
      provider: 'clawagent',
      status: 'completed',
      recommendation: 'adjust_score',
      confidence_score: 0.82,
      summary: 'AI supports a narrow score adjustment.',
      completed_at: '2026-08-12T08:05:00.000Z',
      response_payload: {
        debate_trace: [
          {
            type: 'decision',
            fromRole: 'Neutral Mediator',
            evidence: JSON.stringify({
              recommendation: 'adjust_score',
              verdict: 'A narrow score adjustment is recommended.',
              rationale: 'The submitted evidence supports a narrow adjustment.',
              evidence_summary: 'The task history and attached evidence agree.',
              action_items: ['Record the adjusted score.'],
              unknowns_or_missing_evidence: 'No additional evidence is required.',
              scores: { task_worker_score: 82 },
            }),
          },
        ],
      },
    },
  ]
) {
  return render(AdminDisputeShowPage, {
    props: {
      dispute: {
        id: 'dispute-1',
        review_session_id: null,
        task_id: 'task-1',
        task_title: 'Review governance task',
        task_description: 'Task already escalated to admin.',
        organization_id: 'org-1',
        project_id: 'project-1',
        reviewee_id: 'user-1',
        reviewee_username: 'duyet',
        reviewee_email: 'duyet@example.com',
        status: 'admin_reviewing',
        source_type: 'task_review_workflow',
        dispute_review_type: 'task_review',
        dispute_reason: 'The task review omitted submitted evidence.',
        requested_outcome: 'adjust_score',
        created_at: '2026-08-12T08:00:00.000Z',
        disputed_dimensions: {},
        disputed_skill_reviews: [],
        final_decision: null,
        final_rationale: null,
        review_session_status: 'disputed',
        runtime_context: {
          organization: { name: 'Acme' },
          project: { name: 'Mercury' },
          task: { title: 'Review governance task' },
        },
        task_review_detail: {
          task: {
            id: 'task-1',
            title: 'Review governance task',
            description: 'Task already escalated to admin.',
            status: 'in_review',
            priority: 'medium',
            assigned_to: 'user-1',
            creator_id: 'manager-1',
          },
          assignment: null,
          workflow: {
            id: 'dispute-1',
            status: 'admin_reviewing',
            completed_review_count: 2,
            required_review_count: 2,
          },
          reviewers: [],
          comments: [],
          reviewMessages: [],
        },
      },
      comments: [],
      evidences: [],
      case_files: [],
      ai_evaluations: aiEvaluations,
      timeline: [],
    },
  })
}

describe('AdminDisputeShowPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    getSpy.mockResolvedValue({ data: { data: [] } })
    postSpy.mockResolvedValue({ data: {} })
  })

  it('uses a task-detail layout and places the AI conclusion in its own tab', async () => {
    renderDetail()

    expect(screen.getByRole('heading', { name: 'Review governance task' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Nội dung Task' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Kỹ năng' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Phân công' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Tệp/i })).toBeInTheDocument()
    expect(screen.queryByText('Admin decision room')).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: 'Xử lý' })).not.toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Kết luận AI' })).toBeInTheDocument()
    expect(screen.queryByText('A narrow score adjustment is recommended.')).not.toBeInTheDocument()
    await fireEvent.click(screen.getByRole('tab', { name: 'Kết luận AI' }))
    expect(screen.getByText('A narrow score adjustment is recommended.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dùng kết luận AI để chốt tranh chấp' })).toBeInTheDocument()
  })

  it('accepts the AI conclusion as an auditable admin decision without opening a form', async () => {
    renderDetail()

    await fireEvent.click(screen.getByRole('tab', { name: 'Kết luận AI' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Dùng kết luận AI để chốt tranh chấp' }))

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        '/api/admin/reviews/disputes/dispute-1/resolve',
        expect.objectContaining({
          finalDecision: 'adjust_score',
          finalRationale:
            'Quản trị viên dùng kết luận AI để chốt tranh chấp. AI supports a narrow score adjustment.',
          sourceType: 'task_review_workflow',
        })
      )
    })
  })

  it('allows an alternative ruling only after the admin opens it and writes a rationale', async () => {
    renderDetail()

    await fireEvent.click(screen.getByRole('tab', { name: 'Kết luận AI' }))
    await fireEvent.click(screen.getByRole('button', { name: 'Ra quyết định khác' }))
    await fireEvent.input(screen.getByLabelText(/Căn cứ quyết định/), {
      target: { value: 'Admin requires a fresh review based on the complete task record.' },
    })
    await fireEvent.click(
      screen.getByRole('button', { name: /Issue decision|Ban hành quyết định/ })
    )

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        '/api/admin/reviews/disputes/dispute-1/resolve',
        expect.objectContaining({
          finalDecision: 'dismiss_dispute',
          finalRationale: 'Admin requires a fresh review based on the complete task record.',
        })
      )
    })
  })

  it('keeps AI acceptance disabled while a conclusion is unavailable', async () => {
    renderDetail([])

    await fireEvent.click(screen.getByRole('tab', { name: 'Kết luận AI' }))
    expect(screen.getByRole('button', { name: 'Dùng kết luận AI để chốt tranh chấp' })).toBeDisabled()
  })

  it('shows the exact provider diagnostic when the latest AI evaluation failed', async () => {
    renderDetail([
      {
        id: 'ai-failed-1',
        provider: 'clawagent',
        status: 'failed',
        recommendation: null,
        confidence_score: null,
        summary: null,
        error_message: 'LLM call failed with HTTP 503: model UNAVAILABLE due to high demand',
        completed_at: '2026-08-14T02:11:38.354Z',
      },
    ])

    await fireEvent.click(screen.getByRole('tab', { name: 'Kết luận AI' }))
    expect(screen.getByText('Model AI đang quá tải tạm thời')).toBeInTheDocument()
    expect(screen.getByText(/Không cần đổi SUAR_DISPUTE_API_KEY/i)).toBeInTheDocument()
    await fireEvent.click(screen.getByText('Xem lỗi kỹ thuật đầy đủ'))
    expect(screen.getByText(/LLM call failed with HTTP 503/)).toBeInTheDocument()
    expect(screen.getByText(/ai-failed-1/)).toBeInTheDocument()
  })
})
