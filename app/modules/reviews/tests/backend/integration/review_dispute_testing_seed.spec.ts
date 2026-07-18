import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import User from '#modules/users/infra/models/profile/user'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'

function parseSnapshot(value: unknown): Record<string, unknown> {
  return typeof value === 'string'
    ? (JSON.parse(value) as Record<string, unknown>)
    : ((value ?? {}) as Record<string, unknown>)
}

function snapshotRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function snapshotList(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? (value as Record<string, unknown>[]) : []
}

test.group('Integration | Review dispute testing seed', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('seed-review-dispute-exchange-flow creates a coherent admin dossier', async ({
    assert,
    client,
  }) => {
    const seedResponse = await client.post('/api/testing/seed-review-dispute-exchange-flow').json({
      timestamp: Date.now(),
      nonce: 'coherent-dossier',
      demoNames: true,
    })

    seedResponse.assertStatus(200)

    const body = seedResponse.body() as {
      data: {
        disputeId: string
        organizationId: string
        projectId: string
        sprintId: string
        taskId: string
        assignmentId: string
        reviewSessionId: string
        revieweeId: string
        taskRequiredSkillId: string
        submissionId: string
        submissionEvidenceIds: string[]
        skillReviewId: string
      }
    }
    const data = body.data

    const requiredSkills = (await db
      .from('task_required_skills')
      .where('task_id', data.taskId)
      .select('id', 'skill_id', 'required_public_proficiency_code')) as Array<{
      id: string
      skill_id: string
      required_public_proficiency_code: string
    }>
    const submission = (await db
      .from('task_submissions')
      .where('id', data.submissionId)
      .first()) as { id: string; task_id: string; status: string } | null
    const submissionEvidences = (await db
      .from('task_submission_evidences')
      .where('submission_id', data.submissionId)
      .select('id')) as Array<{ id: string }>
    const skillReview = (await db
      .from('skill_reviews')
      .where('id', data.skillReviewId)
      .select('id', 'task_required_skill_id')
      .first()) as { id: string; task_required_skill_id: string | null } | null

    assert.lengthOf(requiredSkills, 1)
    assert.equal(requiredSkills[0]?.id, data.taskRequiredSkillId)
    assert.equal(submission?.task_id, data.taskId)
    assert.equal(submission?.status, 'submitted')
    assert.sameMembers(
      submissionEvidences.map((evidence) => evidence.id),
      data.submissionEvidenceIds
    )
    assert.equal(skillReview?.task_required_skill_id, data.taskRequiredSkillId)

    const reviewee = await User.findOrFail(data.revieweeId)
    const reportResponse = await client
      .post(`/api/reviews/disputes/${data.disputeId}/report`)
      .loginAs(reviewee)
      .json({
        escalationReason: 'Testing seed should produce a complete admin dossier',
      })

    reportResponse.assertStatus(200)

    const caseFile = (await db
      .from('review_dispute_case_files')
      .where('dispute_id', data.disputeId)
      .select(
        'completeness_score',
        'missing_data',
        'evidences_snapshot',
        'task_snapshot',
        'reviewer_context_snapshot',
        'reviewee_profile_context_snapshot'
      )
      .firstOrFail()) as {
      completeness_score: number
      missing_data: string | Array<{ key: string }>
      evidences_snapshot: unknown
      task_snapshot: unknown
      reviewer_context_snapshot: unknown
      reviewee_profile_context_snapshot: unknown
    }
    const missingData: Array<{ key: string }> =
      typeof caseFile.missing_data === 'string'
        ? (JSON.parse(caseFile.missing_data) as Array<{ key: string }>)
        : caseFile.missing_data
    const evidencesText =
      typeof caseFile.evidences_snapshot === 'string'
        ? caseFile.evidences_snapshot
        : JSON.stringify(caseFile.evidences_snapshot ?? {})

    assert.equal(caseFile.completeness_score, 100)
    assert.deepEqual(missingData, [])
    assert.include(evidencesText, 'Checkout regression test run')

    const taskSnapshot = parseSnapshot(caseFile.task_snapshot)
    const reviewerContext = parseSnapshot(caseFile.reviewer_context_snapshot)
    const revieweeContext = parseSnapshot(caseFile.reviewee_profile_context_snapshot)

    const projectSnapshot = snapshotRecord(taskSnapshot['project'])

    assert.equal(snapshotRecord(taskSnapshot['organization'])['id'], data.organizationId)
    assert.equal(projectSnapshot['id'], data.projectId)
    assert.equal(projectSnapshot['sprint_id'], data.sprintId)
    assert.isAtLeast(snapshotList(taskSnapshot['related_project_tasks']).length, 1)
    assert.isAtLeast(snapshotList(taskSnapshot['sprint_peer_tasks']).length, 1)
    assert.isAbove(Object.keys(snapshotRecord(reviewerContext['profile'])).length, 0)
    assert.isAbove(Object.keys(snapshotRecord(revieweeContext['profile'])).length, 0)
    assert.isAtLeast(snapshotList(reviewerContext['work_schedule']).length, 1)
    assert.isAtLeast(snapshotList(revieweeContext['work_schedule']).length, 1)
  })
})
