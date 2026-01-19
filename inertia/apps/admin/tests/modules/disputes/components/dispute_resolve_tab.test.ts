import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import DisputeResolveTab from '@/apps/admin/modules/disputes/components/dispute_resolve_tab.svelte'

describe('DisputeResolveTab', () => {
  it('renders latest escalation dossier details from case file snapshots', () => {
    render(DisputeResolveTab, {
      props: {
        dispute: {
          id: 'dispute-1',
          status: 'admin_reviewing',
          created_at: '2026-07-09T07:00:00.000Z',
          final_decision: null,
          final_rationale: null,
        },
        caseFiles: [
          {
            id: 'case-file-1',
            case_version: 2,
            completeness_score: 88,
            created_at: '2026-07-09T08:00:00.000Z',
            dispute_claim_snapshot: {
              requested_outcome: 'adjust_score',
              dispute_reason: 'Reviewer missed benchmark evidence',
              dispute_comments: [
                { body: 'Please review benchmark screenshots again.', author_context: 'reviewee' },
              ],
            },
            task_comments_snapshot: [
              {
                body: 'Benchmarks were attached in previous sprint thread.',
                comment_type: 'review_note',
                review_relevance: true,
              },
            ],
            task_history_snapshot: [
              {
                field_name: 'status',
                old_value: 'in_progress',
                new_value: 'done',
              },
            ],
            evidences_snapshot: [{ title: 'Benchmark screenshots', evidence_type: 'screenshot' }],
            skill_reviews_snapshot: [{ skill_id: 'skill-1', comment: 'Good work' }],
            missing_data: ['self_assessment'],
          },
        ],
        aiEvaluations: [],
        buildingCaseFile: false,
        startingAi: false,
        resolving: false,
        finalDecision: 'adjust_score',
        profileUpdateAction: 'recalculate_after_adjustment',
        reviewerCredibilityAction: 'mark_disputed_review',
        finalRationale: 'Need to adjust based on dossier',
        onBuildCaseFile: vi.fn(),
        onStartAi: vi.fn(),
        onResolve: vi.fn(),
      },
    })

    expect(screen.getByText('Hồ sơ vụ việc v2')).toBeInTheDocument()
    expect(screen.getByText('adjust_score')).toBeInTheDocument()
    expect(screen.getByText('Reviewer missed benchmark evidence')).toBeInTheDocument()
    expect(screen.getByText('Bình luận công việc')).toBeInTheDocument()
    expect(
      screen.getByText('Benchmarks were attached in previous sprint thread.')
    ).toBeInTheDocument()
    expect(screen.getByText('Trao đổi tranh chấp trong hồ sơ')).toBeInTheDocument()
    expect(screen.getByText('Please review benchmark screenshots again.')).toBeInTheDocument()
    expect(screen.getByText('Evidence đi kèm dossier')).toBeInTheDocument()
    expect(screen.getByText('Benchmark screenshots')).toBeInTheDocument()
    expect(screen.getByText('Dữ liệu khuyến nghị thiếu')).toBeInTheDocument()
    expect(screen.getByText('self_assessment')).toBeInTheDocument()
    expect(screen.getByText('status')).toBeInTheDocument()
    expect(screen.getByText('in_progress → done')).toBeInTheDocument()
  })

  it('locks normal resolve when required dossier data is missing until admin override has a reason', async () => {
    render(DisputeResolveTab, {
      props: {
        dispute: {
          id: 'dispute-2',
          status: 'admin_reviewing',
          created_at: '2026-07-09T07:00:00.000Z',
          final_decision: null,
          final_rationale: null,
        },
        caseFiles: [
          {
            id: 'case-file-2',
            case_version: 1,
            completeness_score: 50,
            created_at: '2026-07-09T08:00:00.000Z',
            dispute_claim_snapshot: {
              requested_outcome: 'adjust_score',
              dispute_reason: 'Missing counterparty exchange',
              dispute_comments: [],
            },
            task_comments_snapshot: [],
            task_history_snapshot: [],
            evidences_snapshot: [],
            skill_reviews_snapshot: [],
            missing_data: ['counterparty_dispute_message'],
          },
        ],
        aiEvaluations: [],
        buildingCaseFile: false,
        startingAi: false,
        resolving: false,
        finalDecision: 'adjust_score',
        profileUpdateAction: 'recalculate_after_adjustment',
        reviewerCredibilityAction: 'mark_disputed_review',
        finalRationale: 'Need platform intervention',
        onBuildCaseFile: vi.fn(),
        onStartAi: vi.fn(),
        onResolve: vi.fn(),
      },
    })

    const resolveButton = screen.getByRole('button', { name: 'Ban hành quyết định' })
    expect(resolveButton).toBeDisabled()
    expect(screen.getByText('Dossier chưa đủ dữ liệu bắt buộc')).toBeInTheDocument()

    await fireEvent.click(screen.getByLabelText('Ghi đè'))
    expect(resolveButton).toBeDisabled()

    await fireEvent.input(screen.getByLabelText(/Lý do override/), {
      target: { value: 'Counterparty unavailable after repeated contact.' },
    })
    expect(resolveButton).not.toBeDisabled()
  })

  it('uses runtime context instead of case files for sprint review disputes', () => {
    render(DisputeResolveTab, {
      props: {
        dispute: {
          id: 'sprint-dispute-1',
          status: 'reported',
          created_at: '2026-07-09T07:00:00.000Z',
          final_decision: null,
          final_rationale: null,
          source_type: 'sprint_review_dispute',
          dispute_review_type: 'manager_review',
          runtime_context: {
            organization: { id: 'org-1', name: 'Acme Ops' },
            project: { id: 'project-1', name: 'Project Mercury' },
            sprint: { id: 'sprint-1', name: 'Sprint 7' },
            sprint_peer_tasks: [{ id: 'task-peer-1', title: 'Peer task in same sprint' }],
            manager_reviews: [{ reviewer_id: 'manager-1' }],
            environment_reviews: [],
          },
        },
        caseFiles: [],
        aiEvaluations: [],
        buildingCaseFile: false,
        startingAi: false,
        resolving: false,
        finalDecision: 'dismiss_dispute',
        profileUpdateAction: 'no_action',
        reviewerCredibilityAction: 'no_action',
        finalRationale: 'Runtime context is enough for admin decision.',
        onBuildCaseFile: vi.fn(),
        onStartAi: vi.fn(),
        onResolve: vi.fn(),
      },
    })

    expect(screen.getAllByText('Ngữ cảnh thực thi').length).toBeGreaterThan(0)
    expect(screen.getByText('Project Mercury')).toBeInTheDocument()
    expect(screen.getByText('Peer task in same sprint')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lập snapshot' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gọi AI' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Ban hành quyết định' })).not.toBeDisabled()
    expect(screen.queryByText('Dossier chưa đủ dữ liệu bắt buộc')).not.toBeInTheDocument()
  })

  it('does not mark AI council ready when the latest available AI run failed', () => {
    render(DisputeResolveTab, {
      props: {
        dispute: {
          id: 'dispute-ai-failed',
          status: 'admin_reviewing',
          created_at: '2026-07-09T07:00:00.000Z',
          final_decision: null,
          final_rationale: null,
        },
        caseFiles: [
          {
            id: 'case-file-ai-failed',
            case_version: 1,
            completeness_score: 100,
            created_at: '2026-07-09T08:00:00.000Z',
            missing_data: [],
          },
        ],
        aiEvaluations: [
          {
            id: 'ai-failed',
            provider: 'clawagent',
            status: 'failed',
            recommendation: null,
            confidence_score: null,
            summary: null,
          },
        ],
        buildingCaseFile: false,
        startingAi: false,
        resolving: false,
        finalDecision: 'adjust_score',
        profileUpdateAction: 'recalculate_after_adjustment',
        reviewerCredibilityAction: 'mark_disputed_review',
        finalRationale: 'Admin still needs a human rationale.',
        onBuildCaseFile: vi.fn(),
        onStartAi: vi.fn(),
        onResolve: vi.fn(),
      },
    })

    expect(screen.getByText('Lần gọi gần nhất đang ở trạng thái failed.')).toBeInTheDocument()
    const aiSignal = screen.getByText('Hội đồng AI').closest('div')
    expect(aiSignal).toHaveTextContent('ĐANG CHỜ')
  })

  it('uses task review workflow runtime context without requiring a classic case file', () => {
    render(DisputeResolveTab, {
      props: {
        dispute: {
          id: 'task-workflow-1',
          status: 'reported',
          created_at: '2026-07-09T07:00:00.000Z',
          final_decision: null,
          final_rationale: null,
          source_type: 'task_review_workflow',
          dispute_review_type: 'task_review',
          runtime_context: {
            organization: { id: 'org-1', name: 'Acme Ops' },
            project: { id: 'project-1', name: 'Project Mercury' },
            sprint: { id: 'sprint-1', name: 'Sprint 7' },
            task: { id: 'task-1', title: 'Task under disputed review' },
            sprint_peer_tasks: [{ id: 'task-peer-1', title: 'Peer task in same project' }],
            related_project_tasks: [{ id: 'task-related-1', title: 'Related project task' }],
            task_giver_context: { profile: { username: 'manager' } },
            reviewee_context: { profile: { username: 'worker' } },
          },
        },
        caseFiles: [],
        aiEvaluations: [],
        buildingCaseFile: false,
        startingAi: false,
        resolving: false,
        finalDecision: 'dismiss_dispute',
        profileUpdateAction: 'no_action',
        reviewerCredibilityAction: 'no_action',
        finalRationale: 'Task workflow runtime context is enough for admin decision.',
        onBuildCaseFile: vi.fn(),
        onStartAi: vi.fn(),
        onResolve: vi.fn(),
      },
    })

    expect(screen.getAllByText('Ngữ cảnh thực thi').length).toBeGreaterThan(0)
    expect(screen.getByText('Quy trình công việc')).toBeInTheDocument()
    expect(screen.getByText('Task under disputed review')).toBeInTheDocument()
    expect(screen.getByText('Peer task in same project')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Lập snapshot' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Gọi AI' })).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Ban hành quyết định' })).not.toBeDisabled()
    expect(screen.queryByText('Dossier chưa đủ dữ liệu bắt buộc')).not.toBeInTheDocument()
  })
})
