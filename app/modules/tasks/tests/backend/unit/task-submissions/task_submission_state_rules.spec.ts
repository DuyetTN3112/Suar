import { test } from '@japa/runner'

import {
  canLockTaskSubmission,
  canMutateTaskSubmissionEvidence,
  canSaveTaskSubmissionDraft,
} from '#modules/tasks/domain/task-submissions/task_submission_rules'

test.group('Unit | Task submission state rules', () => {
  test('save draft is allowed only before final submission states', ({ assert }) => {
    for (const submissionStatus of [null, 'draft', 'needs_changes']) {
      assert.isTrue(
        canSaveTaskSubmissionDraft({
          actorId: 'assignee-1',
          assigneeId: 'assignee-1',
          assignmentStatus: 'active',
          submissionStatus,
        }).allowed
      )
    }

    for (const submissionStatus of ['submitted', 'accepted_for_review', 'locked']) {
      assert.isFalse(
        canSaveTaskSubmissionDraft({
          actorId: 'assignee-1',
          assigneeId: 'assignee-1',
          assignmentStatus: 'active',
          submissionStatus,
        }).allowed
      )
    }
  })

  test('lock is allowed only after submission enters reviewable state', ({ assert }) => {
    for (const status of ['submitted', 'accepted_for_review']) {
      assert.isTrue(canLockTaskSubmission(status).allowed)
    }

    for (const status of ['draft', 'needs_changes', 'locked']) {
      assert.isFalse(canLockTaskSubmission(status).allowed)
    }
  })

  test('evidence mutation is allowed for draft revisions and blocked after submit', ({ assert }) => {
    for (const status of ['draft', 'needs_changes']) {
      assert.isTrue(canMutateTaskSubmissionEvidence(status).allowed)
    }

    for (const status of ['submitted', 'accepted_for_review', 'locked']) {
      assert.isFalse(canMutateTaskSubmissionEvidence(status).allowed)
    }
  })
})
