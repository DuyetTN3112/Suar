import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import DisputeResolveTab from '@/apps/admin/modules/disputes/components/dispute_resolve_tab.svelte'

function renderPanel(overrides: Record<string, unknown> = {}) {
  return render(DisputeResolveTab, {
    props: {
      dispute: {
        id: 'dispute-1',
        status: 'admin_reviewing',
        created_at: '2026-08-12T08:00:00.000Z',
        final_decision: null,
        final_rationale: null,
      },
      aiEvaluations: [
        {
          id: 'ai-1',
          provider: 'clawagent',
          status: 'completed',
          recommendation: 'adjust_score',
          confidence_score: 0.82,
          summary: 'The score should be adjusted to reflect the submitted evidence.',
          response_payload: {
            debate_trace: [
              {
                type: 'trace_initialized',
                roleId: 'system',
                visibility: 'internal',
              },
              {
                type: 'proposal',
                round: 1,
                fromRole: 'Chuyên viên Phân tích Bằng chứng',
                evidence: '# GÓI BẰNG CHỨNG\n\n```json\n{"recommendation":"adjust_score","verdict":"Cần điều chỉnh đánh giá theo chứng cứ."}\n```',
                audit: {
                  template_role_id: 'chief_product_officer',
                  selection_reason: 'Vai trò hội đồng lõi bắt buộc cho mọi tranh chấp task-review.',
                  mandate: 'Đối chiếu task contract, system record và các cáo buộc.',
                  context_used: ['task_contract', 'system_record'],
                  checked_claims: [
                    {
                      claim: 'Task hoàn thành đúng hạn.',
                      assessment: 'Đối chiếu deadline và timestamp hoàn thành.',
                    },
                  ],
                  contribution: 'Khóa các dữ kiện không tranh cãi trước khi hội đồng thảo luận.',
                },
              },
              {
                type: 'decision',
                fromRole: 'Neutral Mediator',
                evidence: JSON.stringify({
                  recommendation: 'adjust_score',
                  verdict: 'Adjust the score after reviewing the submitted evidence.',
                  rationale: 'The submitted evidence supports a narrow adjustment.',
                  evidence_summary: 'The task history and attached evidence agree.',
                  action_items: ['Record the adjusted score.'],
                  unknowns_or_missing_evidence: 'No additional evidence is required.',
                  complexity_assessment: {
                    declared_difficulty: 'medium',
                    assessed_difficulty: 'hard',
                    assessment_status: 'adjusted',
                    basis: ['Phạm vi bao gồm giao diện, API phân quyền và các trạng thái lỗi.'],
                    evidence_summary: 'Tiêu chí nghiệm thu cho thấy thay đổi xuyên nhiều lớp.',
                    profile_effect: 'Chỉ tính lại hồ sơ Suar sau khi quản trị viên phê duyệt.',
                    admin_action_required: true,
                  },
                }),
              },
            ],
          },
        },
      ],
      resolving: false,
      finalDecision: 'dismiss_dispute',
      finalRationale: '',
      onAcceptAi: vi.fn(),
      onResolve: vi.fn(),
      ...overrides,
    },
  })
}

describe('DisputeResolveTab', () => {
  it('shows a decision dossier instead of a one-line AI recommendation', () => {
    renderPanel()

    expect(screen.getByText('Lập luận của AI')).toBeInTheDocument()
    expect(screen.getByText('Chứng cứ đã chi phối kết luận')).toBeInTheDocument()
    expect(screen.getByText('Việc cần thực hiện nếu admin đồng ý')).toBeInTheDocument()
    expect(screen.getByText('Đánh giá độ khó thực tế')).toBeInTheDocument()
    expect(screen.getByText('Khó')).toBeInTheDocument()
    expect(screen.getByText('Phiên tranh luận của hội đồng AI')).toBeInTheDocument()
    expect(screen.getByText(/2 vai trò AI, 2 vòng trao đổi, 2 bản ghi đã nhận/)).toBeInTheDocument()
    expect(screen.getAllByText('AI phân tích chứng cứ').length).toBeGreaterThan(0)
    expect(screen.getAllByText('AI điều phối phiên').length).toBeGreaterThan(0)
    expect(screen.getByText('Thành phần phiên')).toBeInTheDocument()
    expect(screen.getByText('Xem kiểm toán vai trò: role này đã làm gì?')).toBeInTheDocument()
    expect(screen.queryByText('Phân tích bổ sung')).not.toBeInTheDocument()
    expect(screen.getAllByText('Điều chỉnh điểm').length).toBeGreaterThan(0)
    expect(screen.queryByText('```json')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dùng kết luận AI để chốt tranh chấp' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Ra quyết định khác' })).toBeEnabled()
    expect(screen.queryByLabelText(/Căn cứ quyết định/)).not.toBeInTheDocument()
  })

  it('uses the canonical callback verdict when the decision trace is presentation-only', () => {
    renderPanel({
      aiEvaluations: [
        {
          id: 'ai-callback-v2',
          provider: 'clawagent',
          status: 'completed',
          recommendation: 'partially_accept',
          confidence_score: 0.85,
          summary: 'Kết luận đã có cấu trúc.',
          response_payload: {
            verdict: {
              recommendation: 'partially_accept',
              verdict: 'Chấp nhận một phần khiếu nại.',
              rationale: 'Review tiêu cực không có chứng cứ kỹ thuật.',
              evidence_summary: 'Biên bản nghiệm thu và thời hạn hoàn thành khớp nhau.',
              action_items: ['Điều chỉnh bản ghi đánh giá.'],
              unknowns_or_missing_evidence: 'Thiếu biên bản QA chi tiết.',
            },
            debate_trace: [
              {
                type: 'decision',
                roleId: 'senior_council_consensus',
                presentation: { title: 'Kết luận hội đồng', actor: 'Hội đồng Senior Council' },
              },
            ],
          },
        },
      ],
    })

    expect(screen.getByText('Chấp nhận một phần khiếu nại.')).toBeInTheDocument()
    expect(screen.getByText('Review tiêu cực không có chứng cứ kỹ thuật.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dùng kết luận AI để chốt tranh chấp' })).toBeEnabled()
    expect(screen.queryByText(/thiếu hồ sơ kết luận có cấu trúc/)).not.toBeInTheDocument()
  })

  it('requires a separate administrator approval for each AI capability proposal', async () => {
    const onApproveProfileProposal = vi.fn()
    renderPanel({
      dispute: {
        id: 'dispute-1',
        status: 'resolved',
        created_at: '2026-08-12T08:00:00.000Z',
        final_decision: 'partially_accept',
        final_rationale: 'Đã chốt tranh chấp.',
      },
      onApproveProfileProposal,
      aiEvaluations: [
        {
          id: 'ai-profile-proposal',
          provider: 'clawagent',
          status: 'completed',
          recommendation: 'partially_accept',
          confidence_score: 0.85,
          summary: 'Kết luận có proposal profile.',
          response_payload: {
            verdict: {
              recommendation: 'partially_accept',
              verdict: 'Chấp nhận một phần khiếu nại.',
              rationale: 'Review được đối chiếu với contract.',
              evidence_summary: 'Task history và phản hồi reviewer khớp nhau.',
              action_items: ['Admin kiểm tra proposal trước khi áp dụng.'],
              unknowns_or_missing_evidence: 'Không có.',
              profile_assessment: {
                schema_version: 'suar.ai.profile_assessment.v1',
                status: 'proposal_ready',
                work_claim: {
                  statement: 'Thiết kế API phân quyền cho khu vực quản trị.',
                  action: 'design',
                  object: 'API phân quyền',
                  ownership_level: 'contributor',
                  context_summary: 'Task có acceptance criteria và review workflow.',
                  outcome_summary: 'Chỉ là đề xuất trước khi được human review.',
                  evidence_refs: ['task.acceptance_criteria', 'review_messages.0'],
                },
                capability_proposals: [
                  {
                    capability_id: 'skill-svelte',
                    capability_name: 'Svelte',
                    declared_target_level: 'L4',
                    proposed_observed_level: 'L6',
                    assessment_status: 'higher_evidence',
                    evidence_refs: ['task_required_skills.0', 'review_messages.0'],
                    rationale: 'Phạm vi review cho thấy xử lý nhiều trạng thái phức tạp.',
                    requires_human_approval: true,
                  },
                ],
                profile_effect: 'Không thay đổi profile hay level cho tới khi có human approval.',
                blockers: [],
                requires_human_approval: true,
                profile_mutation_permitted: false,
              },
            },
            debate_trace: [],
          },
        },
      ],
    })

    expect(screen.getByText('Đề xuất công việc và năng lực cho hồ sơ')).toBeInTheDocument()
    expect(screen.getByText('Có đề xuất năng lực — chờ quản trị viên phê duyệt')).toBeInTheDocument()
    expect(screen.getByText('Svelte')).toBeInTheDocument()
    expect(screen.getByText('Đề xuất mức cao hơn (chưa áp dụng)')).toBeInTheDocument()
    expect(screen.getByText(/AI không được tự ghi hồ sơ, tự đổi mức năng lực/)).toBeInTheDocument()
    await fireEvent.click(screen.getByRole('button', { name: 'Phê duyệt đề xuất này' }))
    expect(onApproveProfileProposal).toHaveBeenCalledWith('ai-profile-proposal', 0)
  })

  it('reveals a rationale input only when the admin chooses a different decision', async () => {
    const onResolve = vi.fn()
    renderPanel({ onResolve })

    await fireEvent.click(screen.getByRole('button', { name: 'Ra quyết định khác' }))
    await fireEvent.input(screen.getByLabelText(/Căn cứ quyết định/), {
      target: { value: 'The task record supports a re-review instead.' },
    })

    expect(screen.getByRole('button', { name: /Issue decision|Ban hành quyết định/ })).toBeEnabled()
    await fireEvent.click(
      screen.getByRole('button', { name: /Issue decision|Ban hành quyết định/ })
    )
    expect(onResolve).toHaveBeenCalledOnce()
  })

  it('does not allow acceptance when no completed AI conclusion exists', () => {
    renderPanel({ aiEvaluations: [] })

    expect(screen.getByRole('button', { name: 'Dùng kết luận AI để chốt tranh chấp' })).toBeDisabled()
    expect(
      screen.getByText(
        'AI chưa hoàn tất phân tích. Khi callback hoàn tất, hồ sơ kết luận sẽ xuất hiện tại đây.'
      )
    ).toBeInTheDocument()
  })
})
