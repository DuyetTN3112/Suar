import { test } from '@japa/runner'

import {
  COMPLETION_CLAIM_V1_FIXTURE,
  LEGACY_TASK_SUBMISSION_FIXTURE,
  PROJECT_CONTEXT_VERSION_V1_FIXTURE,
  RESOLVED_TASK_CONTRACT_V1_FIXTURE,
  REVIEW_OBSERVATION_V1_FIXTURE,
  TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE,
  TASK_CONTRACT_VERSION_V1_FIXTURE,
  TASK_SPECIFICATION_VERSION_V1_FIXTURE,
  WORK_PACKAGE_V1_FIXTURE,
  WORK_PACKAGE_VERSION_V1_FIXTURE,
} from '#modules/tasks/public_contracts/task-authoring/golden_fixtures'
import {
  isCompletionClaimV1,
  isLegacyTaskSubmission,
  isProjectContextVersionV1,
  isResolvedTaskContractV1,
  isReviewObservationV1,
  isTaskAssignmentSnapshotV1,
  isTaskContractVersionV1,
  isTaskSpecificationVersionV1,
  isWorkPackageV1,
  isWorkPackageVersionV1,
} from '#modules/tasks/public_contracts/task-authoring/validators'

test.group('Unit | TVA golden contract fixtures', () => {
  test('accepts every Task and Project V1 golden fixture', ({ assert }) => {
    assert.isTrue(isProjectContextVersionV1(PROJECT_CONTEXT_VERSION_V1_FIXTURE))
    assert.isTrue(isWorkPackageV1(WORK_PACKAGE_V1_FIXTURE))
    assert.isTrue(isWorkPackageVersionV1(WORK_PACKAGE_VERSION_V1_FIXTURE))
    assert.isTrue(isTaskSpecificationVersionV1(TASK_SPECIFICATION_VERSION_V1_FIXTURE))
    assert.isTrue(isTaskContractVersionV1(TASK_CONTRACT_VERSION_V1_FIXTURE))
    assert.isTrue(isResolvedTaskContractV1(RESOLVED_TASK_CONTRACT_V1_FIXTURE))
    assert.isTrue(isTaskAssignmentSnapshotV1(TASK_ASSIGNMENT_SNAPSHOT_V1_FIXTURE))
    assert.isTrue(isCompletionClaimV1(COMPLETION_CLAIM_V1_FIXTURE))
    assert.isTrue(isReviewObservationV1(REVIEW_OBSERVATION_V1_FIXTURE))
  })

  test('keeps legacy Task submission explicit and separate from native immutable facts', ({
    assert,
  }) => {
    assert.isTrue(isLegacyTaskSubmission(LEGACY_TASK_SUBMISSION_FIXTURE))
    assert.isFalse(isTaskAssignmentSnapshotV1(LEGACY_TASK_SUBMISSION_FIXTURE))
    assert.isFalse(isCompletionClaimV1(TASK_CONTRACT_VERSION_V1_FIXTURE))
  })
})
