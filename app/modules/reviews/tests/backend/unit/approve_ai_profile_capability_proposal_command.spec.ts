import { test } from '@japa/runner'

import ApproveAiProfileCapabilityProposalCommand from '#modules/reviews/actions/commands/disputes/approve_ai_profile_capability_proposal_command'
import type {
  AiProfileAssessmentApprovalCandidate,
  AiProfileAssessmentApprovalUnitOfWork,
  AiProfileCapabilityApprovalWrite,
} from '#modules/reviews/actions/ports/outbound/ai_profile_assessment_approval_unit_of_work'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'

function candidate(overrides: Partial<AiProfileAssessmentApprovalCandidate> = {}) {
  return {
    evaluationId: 'evaluation-1',
    sourceType: 'task_review_workflow',
    sourceId: 'workflow-1',
    evaluationStatus: 'completed',
    requestPayload: {
      profile_assessment_contract: {
        profile_eligibility: true,
        capabilities: [
          {
            capability_id: 'capability-svelte',
            assessment_ceiling: null,
          },
        ],
      },
    },
    responsePayload: {
      verdict: {
        profile_assessment: {
          schema_version: 'suar.ai.profile_assessment.v1',
          status: 'proposal_ready',
          work_claim: {
            statement: 'Thiết kế luồng phân quyền cho khu vực quản trị.',
            action: 'thiết kế',
            object: 'luồng phân quyền',
            ownership_level: 'contributor',
            context_summary: 'Thay đổi có giao diện và quy tắc phân quyền.',
            outcome_summary: 'Luồng được review task chấp nhận.',
            evidence_refs: ['task.acceptance_criteria', 'review_messages.0'],
          },
          capability_proposals: [
            {
              capability_id: 'capability-svelte',
              capability_name: 'Svelte',
              declared_target_level: 'l4',
              proposed_observed_level: 'l6',
              assessment_status: 'higher_evidence',
              evidence_refs: ['task_required_skills.0', 'review_messages.0'],
              rationale: 'Phạm vi thực tế vượt mức khai báo ban đầu.',
              requires_human_approval: true,
            },
          ],
          profile_effect: 'Chỉ dùng cho hồ sơ sau khi quản trị viên phê duyệt và review hoàn tất.',
          blockers: [],
          requires_human_approval: true,
          profile_mutation_permitted: false,
        },
      },
    },
    workflow: {
      id: 'workflow-1',
      status: 'resolved',
      taskId: 'task-1',
      taskAssignmentId: 'assignment-1',
      revieweeId: 'user-1',
    },
    ...overrides,
  } satisfies AiProfileAssessmentApprovalCandidate
}

function approvals(input: {
  role?: string | null | undefined
  candidate?: AiProfileAssessmentApprovalCandidate | null
  writes: AiProfileCapabilityApprovalWrite[]
}): AiProfileAssessmentApprovalUnitOfWork {
  return {
    async run(work) {
      return work({
        findActorSystemRole: async () => input.role ?? 'system_admin',
        loadCandidateForUpdate: async () => input.candidate ?? candidate(),
        createOrLoadCapabilityApproval: async (write) => {
          input.writes.push(write)
          return {
            id: 'approval-1',
            evaluationId: write.evaluationId,
            proposalIndex: write.proposalIndex,
            approvedAt: new Date('2026-08-13T10:00:00.000Z'),
          }
        },
      })
    },
  }
}

test.group('Unit | Approve AI profile capability proposal command', () => {
  test('records an attributable proposal approval without mutating the profile', async ({ assert }) => {
    const writes: AiProfileCapabilityApprovalWrite[] = []
    const command = new ApproveAiProfileCapabilityProposalCommand(
      makeSystemReviewActionContext('admin-1'),
      approvals({ writes })
    )

    const result = await command.handle({
      disputeId: 'workflow-1',
      evaluationId: 'evaluation-1',
      proposalIndex: 0,
    })

    assert.deepEqual(result, {
      approvalId: 'approval-1',
      evaluationId: 'evaluation-1',
      proposalIndex: 0,
      profileProjection: 'awaiting_task_review_done',
      approvedAt: '2026-08-13T10:00:00.000Z',
    })
    assert.lengthOf(writes, 1)
    assert.equal(writes[0]?.approvedObservedLevel, 'l6')
    assert.equal(writes[0]?.subjectUserId, 'user-1')
    assert.equal(writes[0]?.taskAssignmentId, 'assignment-1')
    assert.deepEqual(writes[0]?.evidenceRefs, ['task_required_skills.0', 'review_messages.0'])
  })

  test('allows a higher observed level when the review evidence supports it', async ({ assert }) => {
    const writes: AiProfileCapabilityApprovalWrite[] = []
    const invalid = candidate()
    const assessment = (
      invalid.responsePayload['verdict'] as {
        profile_assessment: { capability_proposals: Array<Record<string, unknown>> }
      }
    ).profile_assessment
    assessment.capability_proposals[0] = {
      capability_id: 'capability-svelte',
      capability_name: 'Svelte',
      declared_target_level: 'l4',
      proposed_observed_level: 'l7',
      assessment_status: 'higher_evidence',
      evidence_refs: ['task_required_skills.0'],
      rationale: 'AI nhận định cao hơn mức điều kiện nhận task.',
      requires_human_approval: true,
    }

    const command = new ApproveAiProfileCapabilityProposalCommand(
      makeSystemReviewActionContext('admin-1'),
      approvals({ writes, candidate: invalid })
    )

    await command.handle({ disputeId: 'workflow-1', evaluationId: 'evaluation-1', proposalIndex: 0 })
    assert.lengthOf(writes, 1)
    assert.equal(writes[0]?.approvedObservedLevel, 'l7')
  })
})
