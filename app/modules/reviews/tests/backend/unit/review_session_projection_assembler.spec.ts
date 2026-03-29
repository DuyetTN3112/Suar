import { test } from '@japa/runner'

import {
  assembleReviewSessionProjections,
  collectReviewSessionProjectionIds,
  type ReviewSessionProjectionFacts,
  type ReviewSessionProjectionSource,
} from '#modules/reviews/actions/mappers/review_session_projection_mapper'

const date = (value: string) => ({ toISO: () => value })

const session: ReviewSessionProjectionSource = {
  id: 'session-1',
  task_assignment_id: 'assignment-1',
  reviewee_id: 'reviewee-1',
  status: 'completed',
  manager_review_completed: true,
  creator_reviewer_id: null,
  creator_review_completed: false,
  manager_reviews_count: 1,
  peer_reviews_count: 0,
  required_peer_reviews: 0,
  required_total_reviews: 1,
  minimum_manager_reviews: 1,
  minimum_peer_reviews: 0,
  confirmations: null,
  overall_quality_score: 80,
  delivery_timeliness: 'on_time',
  requirement_adherence: 80,
  communication_quality: 80,
  code_quality_score: 80,
  proactiveness_score: 80,
  would_work_with_again: true,
  strengths_observed: 'Clear delivery',
  areas_for_improvement: null,
  deadline: null,
  created_at: date('2026-07-26T00:00:00.000Z'),
  completed_at: date('2026-07-26T01:00:00.000Z'),
  updated_at: date('2026-07-26T01:00:00.000Z'),
  skill_reviews: [
    {
      id: 'review-1',
      review_session_id: 'session-1',
      reviewer_id: 'reviewer-1',
      reviewer_type: 'manager',
      skill_id: 'inactive-skill',
      assigned_public_proficiency_code: 'l8',
      proficiency_level_id: null,
      observed_level_id: null,
      rubric_version_id: null,
      confidence: 'high',
      rationale: null,
      observable_behaviors: [],
      review_status: 'submitted',
      comment: 'Strong delivery',
      submitted_at: date('2026-07-26T00:30:00.000Z'),
      superseded_by: null,
      is_fraud: false,
      created_at: date('2026-07-26T00:00:00.000Z'),
      updated_at: date('2026-07-26T00:30:00.000Z'),
    },
  ],
}

const facts: ReviewSessionProjectionFacts = {
  skills: [
    {
      id: 'inactive-skill',
      name: 'Historical Skill',
      categoryCode: 'technology',
      is_active: false,
    },
  ],
  identities: [
    {
      id: 'reviewer-1',
      username: 'reviewer',
      email: 'reviewer@example.test',
    },
    {
      id: 'reviewee-1',
      username: 'reviewee',
      email: 'reviewee@example.test',
    },
  ],
  assignments: [
    {
      id: 'assignment-1',
      taskId: 'task-1',
      assigneeId: 'reviewee-1',
      assignmentStatus: 'completed',
      estimatedHours: 8,
      actualHours: 7,
      completionNotes: 'Delivered',
      task: {
        id: 'task-1',
        title: 'Private task',
        description: 'Detail description',
        status: 'done',
        priority: 'high',
        difficulty: 'hard',
        dueDate: '2026-07-25T00:00:00.000Z',
      },
    },
  ],
}

test.group('Unit | Review session projection assembler', () => {
  test('collects only identities allowed by projection options', ({ assert }) => {
    assert.deepEqual(
      collectReviewSessionProjectionIds([session], {
        includeReviewerIdentity: true,
        includeRevieweeIdentity: true,
      }),
      {
        skillIds: ['inactive-skill'],
        identityIds: ['reviewer-1', 'reviewee-1'],
        assignmentIds: ['assignment-1'],
      }
    )
    assert.deepEqual(
      collectReviewSessionProjectionIds([session], {
        includeReviewerIdentity: false,
      }).identityIds,
      []
    )
  })

  test('assembles historical skill, identity, and assignment facts for detail', ({ assert }) => {
    const [projection] = assembleReviewSessionProjections([session], facts, {
      includeReviewerIdentity: true,
      includeRevieweeIdentity: true,
      assignmentProjection: 'detail',
    })

    assert.deepEqual(projection?.reviewee, {
      id: 'reviewee-1',
      username: 'reviewee',
      email: 'reviewee@example.test',
    })
    assert.deepInclude(projection?.skill_reviews[0], {
      skill: {
        id: 'inactive-skill',
        skill_name: 'Historical Skill',
        category_code: 'technology',
        is_active: false,
      },
      reviewer: {
        id: 'reviewer-1',
        username: 'reviewer',
        email: 'reviewer@example.test',
      },
    })
    assert.deepEqual(projection?.task_assignment, {
      id: 'assignment-1',
      task_id: 'task-1',
      assignee_id: 'reviewee-1',
      assignment_status: 'completed',
      estimated_hours: 8,
      actual_hours: 7,
      completion_notes: 'Delivered',
      task: {
        id: 'task-1',
        title: 'Private task',
        description: 'Detail description',
        status: 'done',
        priority: 'high',
        difficulty: 'hard',
        due_date: '2026-07-25T00:00:00.000Z',
      },
    })
  })

  test('does not expose reviewer identity or assignment detail on public summaries', ({
    assert,
  }) => {
    const [projection] = assembleReviewSessionProjections([session], facts, {
      includeReviewerIdentity: false,
      assignmentProjection: 'summary',
    })

    assert.notProperty(projection ?? {}, 'reviewee')
    assert.notProperty(projection?.skill_reviews[0] ?? {}, 'reviewer')
    assert.deepEqual(projection?.task_assignment, {
      id: 'assignment-1',
      task_id: 'task-1',
      task: {
        id: 'task-1',
        title: 'Private task',
      },
    })
    assert.notProperty(projection?.task_assignment ?? {}, 'completion_notes')
    assert.notProperty(projection?.task_assignment.task ?? {}, 'description')
  })

  test('emits an explicit assignment tombstone when the provider fact is missing', ({ assert }) => {
    const [projection] = assembleReviewSessionProjections(
      [{ ...session, skill_reviews: [] }],
      { skills: [], identities: [], assignments: [] },
      { includeReviewerIdentity: false, assignmentProjection: 'summary' }
    )

    assert.deepEqual(projection?.task_assignment, {
      id: 'assignment-1',
      task_id: null,
      task: null,
      unavailable: true,
    })
  })
})
