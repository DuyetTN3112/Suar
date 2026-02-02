import { test } from '@japa/runner'

import {
  assembleFlaggedReviewModerationProjections,
  collectFlaggedReviewModerationProjectionIds,
  type FlaggedReviewModerationProjectionFacts,
  type FlaggedReviewModerationSource,
} from '#modules/reviews/actions/mappers/flagged_review_moderation_projection_mapper'

const date = (value: string) => ({ toISO: () => value })

const makeFlaggedReview = (
  id: string,
  reviewedBy: string | null
): FlaggedReviewModerationSource => ({
  id,
  skill_review_id: `skill-review-${id}`,
  flag_type: 'mutual_high',
  severity: 'high',
  detected_at: date('2026-07-26T00:00:00.000Z'),
  status: reviewedBy ? 'confirmed' : 'pending',
  reviewed_by: reviewedBy,
  reviewed_at: reviewedBy ? date('2026-07-26T01:00:00.000Z') : null,
  notes: null,
  created_at: date('2026-07-26T00:00:00.000Z'),
  updated_at: date('2026-07-26T01:00:00.000Z'),
  skill_review: {
    reviewer_id: 'author-1',
    skill_id: 'skill-1',
    review_session_id: 'session-1',
    comment: 'Suspicious review',
    assigned_public_proficiency_code: 'l8',
    review_session: {
      reviewee_id: 'reviewee-1',
      task_assignment_id: 'assignment-1',
    },
  },
})

const baseFacts: FlaggedReviewModerationProjectionFacts = {
  identities: [
    { id: 'author-1', username: 'author', email: 'author@example.test' },
    { id: 'moderator-1', username: 'moderator', email: 'moderator@example.test' },
    { id: 'reviewee-1', username: 'reviewee', email: null },
  ],
  skills: [
    {
      id: 'skill-1',
      name: 'TypeScript',
      categoryCode: 'technology',
    },
  ],
  assignments: [
    {
      id: 'assignment-1',
      taskId: 'task-1',
      assigneeId: 'reviewee-1',
      assignmentStatus: 'completed',
      estimatedHours: null,
      actualHours: null,
      completionNotes: null,
      task: {
        id: 'task-1',
        title: 'Moderated task',
        description: 'Task description',
        status: 'done',
        priority: 'medium',
        difficulty: null,
        dueDate: null,
      },
    },
  ],
}

test.group('Unit | Flagged review moderation projection assembler', () => {
  test('collects deduplicated hydration identifiers for the query', ({ assert }) => {
    const ids = collectFlaggedReviewModerationProjectionIds([
      makeFlaggedReview('flag-1', 'moderator-1'),
      makeFlaggedReview('flag-2', 'moderator-1'),
      makeFlaggedReview('flag-3', null),
    ])

    assert.deepEqual(ids, {
      identityIds: ['author-1', 'moderator-1', 'reviewee-1'],
      skillIds: ['skill-1'],
      assignmentIds: ['assignment-1'],
    })
  })

  test('assembles hydrated moderation data without performing I/O', ({ assert }) => {
    const result = assembleFlaggedReviewModerationProjections(
      [makeFlaggedReview('flag-1', 'moderator-1')],
      baseFacts
    )

    assert.deepEqual(result[0]?.moderator, {
      id: 'moderator-1',
      username: 'moderator',
      email: 'moderator@example.test',
    })
    assert.deepEqual(result[0]?.suspicious_reviewer, {
      id: 'author-1',
      username: 'author',
      email: 'author@example.test',
    })
    assert.deepEqual(result[0]?.task, {
      id: 'task-1',
      title: 'Moderated task',
      description: 'Task description',
    })
  })

  test('preserves reviewed_by but returns a null moderator when identity is missing', ({
    assert,
  }) => {
    const [result] = assembleFlaggedReviewModerationProjections(
      [makeFlaggedReview('flag-1', 'deleted-moderator')],
      {
        ...baseFacts,
        identities: baseFacts.identities.filter((identity) => identity.id !== 'moderator-1'),
      }
    )

    assert.equal(result?.reviewed_by, 'deleted-moderator')
    assert.isNull(result?.moderator)
  })

  test('keeps moderation readable when the reviewee identity is missing', ({ assert }) => {
    const [result] = assembleFlaggedReviewModerationProjections(
      [makeFlaggedReview('flag-1', null)],
      {
        ...baseFacts,
        identities: baseFacts.identities.filter((identity) => identity.id !== 'reviewee-1'),
      }
    )

    assert.deepEqual(result?.reviewee, {
      id: 'reviewee-1',
      username: 'Deleted user',
      email: null,
    })
  })

  test('marks a missing assignment fact without fabricating a task', ({ assert }) => {
    const [result] = assembleFlaggedReviewModerationProjections(
      [makeFlaggedReview('flag-1', null)],
      { ...baseFacts, assignments: [] }
    )

    assert.isNull(result?.task)
    assert.equal(result?.task_assignment_id, 'assignment-1')
    assert.isTrue(result?.task_assignment_unavailable)
  })
})
