import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import { validateProfileAssessmentProposal } from '#modules/reviews/actions/commands/disputes/process_ai_dispute_callback_command'

function proposal() {
  return {
    profile_assessment: {
      schema_version: 'suar.ai.profile_assessment.v1',
      status: 'proposal_ready',
      work_claim: {
        statement: 'Thiết kế API phân quyền.',
        action: 'design',
        object: 'API phân quyền',
        ownership_level: 'contributor',
        context_summary: 'Task review có acceptance criteria.',
        outcome_summary: 'Chờ phê duyệt của con người.',
        evidence_refs: ['task.acceptance_criteria'],
      },
      capability_proposals: [
        {
          capability_id: 'skill-svelte',
          capability_name: 'Svelte',
          declared_minimum_level: 'L4',
          proposed_observed_level: 'L6',
          assessment_status: 'higher_evidence',
          evidence_refs: ['task_required_skills.0', 'review_messages.0'],
          rationale: 'Evidence đánh giá phạm vi đa trạng thái.',
          proposed_task_difficulty_level: 'L7',
          task_difficulty_assessment_status: 'higher_evidence',
          task_difficulty_evidence_refs: ['task.acceptance_criteria', 'review_messages.0'],
          task_difficulty_rationale: 'Phần việc gồm thay đổi trạng thái và kiểm soát quyền.',
          requires_human_approval: true,
        },
      ],
      profile_effect: 'Không có mutation tự động.',
      blockers: [],
      requires_human_approval: true,
      profile_mutation_permitted: false,
    },
  }
}

test.group('Unit | AI profile-assessment proposal callback contract', () => {
  test('accepts a grounded advisory proposal that explicitly forbids profile mutation', ({ assert }) => {
    validateProfileAssessmentProposal(proposal())
    assert.isTrue(true)
  })

  test('requires the assessment when Suar sent a profile-assessment contract', ({ assert }) => {
    assert.throws(
      () => validateProfileAssessmentProposal({}, { required: true }),
      ValidationException
    )
  })

  test('rejects an AI response that tries to permit its own profile mutation', ({ assert }) => {
    const verdict = proposal()
    verdict.profile_assessment.profile_mutation_permitted = true

    assert.throws(
      () => validateProfileAssessmentProposal(verdict),
      ValidationException
    )
  })

  test('rejects a profile-ready proposal without a governed capability assessment', ({ assert }) => {
    const verdict = proposal()
    verdict.profile_assessment.capability_proposals = []

    assert.throws(
      () => validateProfileAssessmentProposal(verdict),
      ValidationException
    )
  })

  test('allows observed evidence above the Task-entry minimum and rejects an ungrounded level proposal', ({
    assert,
  }) => {
    const higherEvidence = proposal()
    const higherCapability = higherEvidence.profile_assessment.capability_proposals[0]
    if (!higherCapability) throw new Error('Expected an AI capability proposal fixture')
    higherCapability.proposed_observed_level = 'L7'
    validateProfileAssessmentProposal(higherEvidence)

    const withoutLevel = proposal()
    const unsupportedCapability = withoutLevel.profile_assessment.capability_proposals[0] as
      | Record<string, unknown>
      | undefined
    if (!unsupportedCapability) throw new Error('Expected an AI capability proposal fixture')
    unsupportedCapability['proposed_observed_level'] = null
    assert.throws(() => validateProfileAssessmentProposal(withoutLevel), ValidationException)
  })

  test('requires a separate work-difficulty conclusion for the newer Task-review contract', ({
    assert,
  }) => {
    const missingDifficulty = proposal()
    const capability = missingDifficulty.profile_assessment.capability_proposals[0] as
      | Record<string, unknown>
      | undefined
    if (!capability) throw new Error('Expected an AI capability proposal fixture')
    delete capability['proposed_task_difficulty_level']
    delete capability['task_difficulty_assessment_status']
    delete capability['task_difficulty_evidence_refs']
    delete capability['task_difficulty_rationale']

    assert.throws(
      () => validateProfileAssessmentProposal(missingDifficulty, { taskDifficultyRequired: true }),
      ValidationException
    )
  })

  test('allows a work difficulty outside the task entry level and Project range', ({ assert }) => {
    const actualDifficultyIsHigher = proposal()
    const capability = actualDifficultyIsHigher.profile_assessment.capability_proposals[0]
    if (!capability) throw new Error('Expected an AI capability proposal fixture')
    capability.proposed_task_difficulty_level = 'L10'

    assert.doesNotThrow(() =>
      validateProfileAssessmentProposal(actualDifficultyIsHigher, {
        taskDifficultyRequired: true,
      })
    )
  })
})
