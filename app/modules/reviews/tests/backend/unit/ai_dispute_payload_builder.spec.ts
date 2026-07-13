import { test } from '@japa/runner'

import { buildAiDisputePayload } from '#modules/reviews/domain/disputes/ai_dispute_payload_builder'

test.group('AI dispute payload builder', () => {
  test('emits Suar AI dispute contract v1 identifiers and provenance', ({ assert }) => {
    const payload = buildAiDisputePayload({
      id: 'case-file-1',
      dispute_id: 'review-dispute-1',
      case_version: 4,
      task_snapshot: { title: 'Implement checkout validation' },
      required_skills_snapshot: [],
      acceptance_criteria_snapshot: {},
      assignment_snapshot: {},
      submission_snapshot: {},
      review_snapshot: {},
      skill_reviews_snapshot: [],
      evidences_snapshot: [],
      self_assessment_snapshot: {},
      task_comments_snapshot: [],
      task_history_snapshot: [],
      dispute_claim_snapshot: {},
      reviewer_context_snapshot: {},
      reviewee_profile_context_snapshot: {},
      completeness_score: 80,
      missing_data: [],
    })

    assert.equal(payload.schema_version, 'suar_ai_dispute_package_v1')
    assert.equal(payload.source_system, 'suar')
    assert.equal(payload.workflow_type, 'review_session_dispute')
    assert.equal(payload.review_dispute_id, 'review-dispute-1')
    assert.equal(payload.case_file_id, 'case-file-1')
    assert.equal(payload.case_version, 4)
    assert.deepEqual(payload.suar_identifiers, {
      review_dispute_id: 'review-dispute-1',
      case_file_id: 'case-file-1',
      case_version: 4,
    })
    assert.deepEqual(payload.provenance, {
      primary_table: 'review_dispute_case_files',
      primary_id: 'case-file-1',
      related_tables: [
        'review_disputes',
        'tasks',
        'task_assignments',
        'task_submissions',
        'review_sessions',
        'skill_reviews',
        'review_dispute_evidences',
        'organizations',
        'projects',
        'project_sprints',
        'user_profile_snapshots',
        'user_work_history',
      ],
    })
  })

  test('includes rich case-file context needed for AI adjudication', ({ assert }) => {
    const payload = buildAiDisputePayload({
      id: 'case-file-1',
      dispute_id: 'dispute-1',
      task_snapshot: {
        title: 'Implement checkout validation',
        organization_id: 'org-1',
        project_id: 'project-1',
        project_sprint_id: 'sprint-1',
        related_project_tasks: [{ id: 'task-2', title: 'Checkout copy' }],
        sprint_peer_tasks: [{ id: 'task-3', title: 'Checkout QA' }],
      },
      required_skills_snapshot: [{ skill_name: 'Backend' }],
      acceptance_criteria_snapshot: {
        verification_method: 'unit tests and release note',
        email: 'hidden@example.com',
      },
      assignment_snapshot: { assignee_id: 'reviewee-1' },
      submission_snapshot: { summary: 'Validation shipped' },
      review_snapshot: { overall_feedback: 'Release note missing' },
      skill_reviews_snapshot: [{ skill_name: 'Backend', score: 2 }],
      evidences_snapshot: [{ evidence_type: 'test', description: 'Unit tests pass' }],
      self_assessment_snapshot: {
        summary: 'I completed validation and tests',
        phone: '+84901234567',
      },
      task_comments_snapshot: [{ body: 'Reviewer asked for release note' }],
      task_history_snapshot: [{ event: 'submitted', actor_id: 'reviewee-1' }],
      dispute_claim_snapshot: { dispute_reason: 'Score too low', review_type: 'task' },
      reviewer_context_snapshot: { reviewer_id: 'reviewer-1' },
      reviewee_profile_context_snapshot: { reviewee_id: 'reviewee-1' },
      completeness_score: 92,
      missing_data: [{ key: 'reviewer_response', severity: 'low' }],
    })

    assert.equal(payload.dispute_review_type, 'task_review')
    assert.deepEqual(payload.organization, { id: 'org-1' })
    assert.deepEqual(payload.project, { id: 'project-1', sprint_id: 'sprint-1' })
    assert.deepEqual(payload.related_project_tasks, [{ id: 'task-2', title: 'Checkout copy' }])
    assert.deepEqual(payload.sprint_peer_tasks, [{ id: 'task-3', title: 'Checkout QA' }])
    assert.deepEqual(payload.reviewer_context, {
      reviewer_id: 'reviewer-1',
      profile: {},
      work_schedule: [],
      task_history: [],
    })
    assert.deepEqual(payload.reviewee_context, {
      reviewee_id: 'reviewee-1',
      profile: {},
      work_schedule: [],
      task_history: [],
    })
    assert.deepEqual(payload.acceptance_criteria, {
      verification_method: 'unit tests and release note',
    })
    assert.deepEqual(payload.self_assessment, {
      summary: 'I completed validation and tests',
    })
    assert.deepEqual(payload.task_history, [{ event: 'submitted', actor_id: 'reviewee-1' }])
    assert.equal(payload.completeness_score, 92)
    assert.includeDeepMembers(payload.missing_data, [
      { key: 'reviewer_response', severity: 'low' },
      { key: 'reviewer_profile_context' },
      { key: 'reviewee_work_schedule_context' },
    ])
  })

  test('preserves explicit organization project and non-task dispute review type', ({ assert }) => {
    const payload = buildAiDisputePayload({
      id: 'case-file-1',
      dispute_id: 'dispute-1',
      task_snapshot: { title: 'Checkout sprint environment' },
      organization_context_snapshot: { id: 'org-1', name: 'Suar Labs' },
      project_context_snapshot: { id: 'project-1', name: 'Checkout', sprint_id: 'sprint-1' },
      related_project_tasks_snapshot: [{ id: 'task-2', title: 'Checkout copy' }],
      sprint_peer_tasks_snapshot: [{ id: 'task-3', title: 'Checkout QA' }],
      dispute_review_type: 'environment_review',
      required_skills_snapshot: [],
      acceptance_criteria_snapshot: {},
      assignment_snapshot: {},
      submission_snapshot: {},
      review_snapshot: {},
      skill_reviews_snapshot: [],
      evidences_snapshot: [],
      self_assessment_snapshot: {},
      task_comments_snapshot: [],
      task_history_snapshot: [],
      dispute_claim_snapshot: {},
      reviewer_context_snapshot: {
        reviewer_id: 'reviewer-1',
        profile: { role: 'developer' },
        work_schedule: [{ date: '2026-07-15', planned_hours: 6 }],
      },
      reviewee_profile_context_snapshot: {
        reviewee_id: 'reviewee-1',
        profile: { role: 'owner' },
        work_schedule: [{ date: '2026-07-15', planned_hours: 4 }],
      },
      completeness_score: 100,
      missing_data: [],
    })

    assert.equal(payload.dispute_review_type, 'environment_review')
    assert.deepEqual(payload.organization, { id: 'org-1', name: 'Suar Labs' })
    assert.deepEqual(payload.project, { id: 'project-1', name: 'Checkout', sprint_id: 'sprint-1' })
    assert.deepEqual(payload.related_project_tasks, [{ id: 'task-2', title: 'Checkout copy' }])
    assert.deepEqual(payload.sprint_peer_tasks, [{ id: 'task-3', title: 'Checkout QA' }])
    assert.deepEqual(payload.missing_data, [])
  })

  test('redacts nested secrets and signed evidence URL tokens before AI handoff', ({ assert }) => {
    const payload = buildAiDisputePayload({
      id: 'case-file-1',
      dispute_id: 'dispute-1',
      task_snapshot: {
        title: 'Checkout dispute',
        personal_email: 'worker@example.com',
        phone_number: '+84901234567',
      },
      required_skills_snapshot: [],
      acceptance_criteria_snapshot: {
        safe: 'visible',
        api_key: 'secret-key',
        evidence_url: 'https://files.example.com/proof.pdf?token=hidden&download=1',
      },
      assignment_snapshot: {},
      submission_snapshot: {},
      review_snapshot: {},
      skill_reviews_snapshot: [],
      evidences_snapshot: [
        {
          title: 'Dispute proof',
          url: 'https://files.example.com/evidence.pdf?X-Amz-Signature=hidden&download=1',
        },
      ],
      self_assessment_snapshot: {},
      task_comments_snapshot: [],
      task_history_snapshot: [],
      dispute_claim_snapshot: {},
      reviewer_context_snapshot: {
        profile: {
          role: 'reviewer',
          secret: 'hidden-secret',
        },
      },
      reviewee_profile_context_snapshot: {},
      completeness_score: 100,
      missing_data: [],
    })

    const serialized = JSON.stringify(payload)

    assert.include(serialized, 'visible')
    assert.include(serialized, 'download=1')
    assert.notInclude(serialized, 'worker@example.com')
    assert.notInclude(serialized, '+84901234567')
    assert.notInclude(serialized, 'secret-key')
    assert.notInclude(serialized, 'hidden-secret')
    assert.notInclude(serialized, 'token=hidden')
    assert.notInclude(serialized, 'X-Amz-Signature=hidden')
  })
})
