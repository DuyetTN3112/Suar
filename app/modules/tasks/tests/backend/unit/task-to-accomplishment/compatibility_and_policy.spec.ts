import { test } from '@japa/runner'

import {
  CURRENT_COMPLETED_ASSIGNMENT_PROFILE_FACT_V1_FIXTURE,
  LEGACY_USER_WORK_HISTORY_ROW_V1_FIXTURE,
} from '#modules/tasks/public_contracts/task-assignment/compatibility_golden_fixtures'
import {
  isCurrentCompletedAssignmentProfileFactV1,
  isLegacyUserWorkHistoryRowV1,
} from '#modules/tasks/public_contracts/task-assignment/compatibility_validators'
import { TVA_CONTRACT_CHANGE_POLICY } from '#modules/tasks/public_contracts/task-authoring/contract_change_policy'
import { TASK_TO_ACCOMPLISHMENT_CONTRACT_LIMITS } from '#modules/tasks/public_contracts/task-authoring/primitives'
import { isCompletionClaimV1 } from '#modules/tasks/public_contracts/task-authoring/validators'

test.group('Unit | TVA compatibility fixtures and change policy', () => {
  test('accepts the current completed-assignment profile fact without inflating it into proof', ({
    assert,
  }) => {
    assert.isTrue(
      isCurrentCompletedAssignmentProfileFactV1(
        CURRENT_COMPLETED_ASSIGNMENT_PROFILE_FACT_V1_FIXTURE
      )
    )
    assert.isFalse(isCompletionClaimV1(CURRENT_COMPLETED_ASSIGNMENT_PROFILE_FACT_V1_FIXTURE))
    assert.isTrue(
      isCurrentCompletedAssignmentProfileFactV1({
        ...CURRENT_COMPLETED_ASSIGNMENT_PROFILE_FACT_V1_FIXTURE,
        projectId: null,
        futureAdditiveField: 'ignored-by-v1-reader',
      })
    )
    assert.isFalse(
      isCurrentCompletedAssignmentProfileFactV1({
        ...CURRENT_COMPLETED_ASSIGNMENT_PROFILE_FACT_V1_FIXTURE,
        contractVersion: 2,
      })
    )
  })

  test('accepts a serialized legacy work-history row but never a native verified claim', ({
    assert,
  }) => {
    assert.isTrue(isLegacyUserWorkHistoryRowV1(LEGACY_USER_WORK_HISTORY_ROW_V1_FIXTURE))
    assert.isFalse(isCompletionClaimV1(LEGACY_USER_WORK_HISTORY_ROW_V1_FIXTURE))
    assert.isFalse(
      isLegacyUserWorkHistoryRowV1({
        ...LEGACY_USER_WORK_HISTORY_ROW_V1_FIXTURE,
        task_assignment_id: 'not-a-uuid',
      })
    )
  })

  test('rejects deep and oversized legacy JSON instead of trusting historical payloads', ({
    assert,
  }) => {
    let tooDeep: Record<string, unknown> = { value: 'leaf' }
    for (let depth = 0; depth <= TASK_TO_ACCOMPLISHMENT_CONTRACT_LIMITS.maxJsonDepth; depth += 1) {
      tooDeep = { child: tooDeep }
    }

    assert.isFalse(
      isCurrentCompletedAssignmentProfileFactV1({
        ...CURRENT_COMPLETED_ASSIGNMENT_PROFILE_FACT_V1_FIXTURE,
        measurableOutcomes: [tooDeep],
      })
    )
    assert.isFalse(
      isLegacyUserWorkHistoryRowV1({
        ...LEGACY_USER_WORK_HISTORY_ROW_V1_FIXTURE,
        knowledge_artifacts: [
          { content: 'x'.repeat(TASK_TO_ACCOMPLISHMENT_CONTRACT_LIMITS.maxStringLength + 1) },
        ],
      })
    )
  })

  test('requires a version bump for breaking semantics and owns a measurable deprecation window', ({
    assert,
  }) => {
    assert.includeMembers(
      [...TVA_CONTRACT_CHANGE_POLICY.additiveSameVersionChanges],
      ['optional_field_with_documented_default', 'unknown_field_preserved_or_ignored']
    )
    assert.includeMembers(
      [...TVA_CONTRACT_CHANGE_POLICY.versionBumpRequiredChanges],
      [
        'required_field_added',
        'field_removed_or_renamed',
        'closed_enum_or_meaning_changed',
        'privacy_or_provenance_weakened',
      ]
    )
    assert.isAtLeast(TVA_CONTRACT_CHANGE_POLICY.deprecationWindow.minimumReleaseCount, 2)
    assert.isAtLeast(TVA_CONTRACT_CHANGE_POLICY.deprecationWindow.minimumCalendarDays, 30)
    assert.equal(TVA_CONTRACT_CHANGE_POLICY.fixtureOwnership.owner, 'WP-01 coordinator')
    assert.isTrue(TVA_CONTRACT_CHANGE_POLICY.fixtureOwnership.sameChangeRequired)
  })
})
