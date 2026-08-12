import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import Task from '#modules/tasks/infra/models/task-authoring/task'
import {
  cleanupTestData,
  OrganizationFactory,
  ProjectFactory,
  TaskAssignmentFactory,
  TaskFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

interface TaskDetailContractBody {
  data: Record<string, unknown>
}

test.group('Contract | GET /api/tasks/:taskId', (group) => {
  group.each.teardown(() => cleanupTestData())

  test('legacy and v1 task detail APIs return same execution fields required by task detail UI', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      project_id: project.id,
    })
    const sprintId = testId()

    await db.table('project_sprints').insert({
      id: sprintId,
      organization_id: org.id,
      project_id: project.id,
      name: 'Sprint 4',
      status: 'active',
      starts_at: new Date('2026-07-01T00:00:00.000Z').toISOString(),
      ends_at: new Date('2026-07-14T00:00:00.000Z').toISOString(),
      created_by: owner.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    await Task.query()
      .where('id', task.id)
      .update({
        project_sprint_id: sprintId,
        verification_method: 'code_review',
        acceptance_criteria: 'Definition of done',
        expected_deliverables: JSON.stringify([{ kind: 'spec' }]),
        measurable_outcomes: JSON.stringify([{ metric: 'coverage', target: '95%' }]),
      })
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: owner.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    const submissionId = testId()
    const reviewSessionId = testId()
    const disputeId = testId()

    await db.table('task_submissions').insert({
      id: submissionId,
      task_assignment_id: assignment.id,
      task_id: task.id,
      submitted_by: owner.id,
      summary: 'Submitted for review',
      status: 'submitted',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    await db.table('review_sessions').insert({
      id: reviewSessionId,
      task_assignment_id: assignment.id,
      reviewee_id: owner.id,
      status: 'in_progress',
      manager_review_completed: true,
      creator_reviewer_id: owner.id,
      creator_review_completed: true,
      manager_reviews_count: 1,
      peer_reviews_count: 0,
      required_peer_reviews: 1,
      required_total_reviews: 2,
      minimum_manager_reviews: 1,
      minimum_peer_reviews: 1,
      confirmations: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    await db.table('review_session_reviewer_assignments').insert({
      review_session_id: reviewSessionId,
      reviewer_id: owner.id,
      reviewer_type: 'peer',
      assignment_role: 'peer_required',
      is_required: true,
      status: 'pending',
    })

    await db.table('review_disputes').insert({
      id: disputeId,
      review_session_id: reviewSessionId,
      task_assignment_id: assignment.id,
      task_id: task.id,
      reviewee_id: owner.id,
      opened_by: owner.id,
      status: 'pending',
      dispute_reason: 'Need more discussion',
      requested_outcome: 'adjust_score',
      disputed_dimensions: JSON.stringify({ quality: true }),
      disputed_skill_reviews: JSON.stringify([]),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    const legacyResponse = await client.get(`/api/tasks/${task.id}`).loginAs(owner)
    legacyResponse.assertStatus(200)
    const canonicalResponse = await client.get(`/api/v1/tasks/${task.id}`).loginAs(owner)
    canonicalResponse.assertStatus(200)

    const legacyBody = legacyResponse.body() as TaskDetailContractBody
    const canonicalBody = canonicalResponse.body() as TaskDetailContractBody
    assert.notProperty(legacyBody, 'success')
    assert.notProperty(canonicalBody, 'success')
    assert.deepEqual(canonicalBody, legacyBody)
    assert.properties(canonicalBody.data, [
      'id',
      'title',
      'description',
      'status',
      'priority',
      'label',
      'acceptance_criteria',
      'verification_method',
      'expected_deliverables',
      'measurable_outcomes',
      'project_id',
      'projectSprintId',
      'projectSprintName',
      'review_zone',
    ])
    assert.equal(canonicalBody.data['projectSprintId'], sprintId)
    assert.equal(canonicalBody.data['projectSprintName'], 'Sprint 4')
    const organization = canonicalBody.data['organization'] as Record<string, unknown> | null
    assert.deepInclude(organization ?? {}, {
      id: org.id,
      name: org.name,
      logo: org.logo ?? null,
    })
    assert.notProperty(organization ?? {}, 'owner_id')
    assert.notProperty(organization ?? {}, 'custom_roles')
    assert.notProperty(organization ?? {}, 'partner_verification_proof')
    assert.notProperty(organization ?? {}, 'plan')
    assert.notProperty(organization ?? {}, 'deleted_at')
    const projectProjection = canonicalBody.data['project'] as Record<string, unknown> | null
    assert.deepInclude(projectProjection ?? {}, {
      id: project.id,
      name: project.name,
    })
    assert.notProperty(projectProjection ?? {}, 'owner_id')
    assert.notProperty(projectProjection ?? {}, 'description')
    assert.notProperty(projectProjection ?? {}, 'settings')
    assert.notProperty(projectProjection ?? {}, 'deleted_at')
    assert.deepInclude(canonicalBody.data['review_zone'], {
      submission_id: submissionId,
      submission_status: 'submitted',
      review_session_id: reviewSessionId,
      review_session_status: 'in_progress',
      dispute_id: disputeId,
      dispute_status: 'pending',
      creator_review_completed: true,
      manager_reviews_count: 1,
      peer_reviews_count: 0,
      required_total_reviews: 2,
      required_peer_reviews: 1,
      required_pending_assignments: 1,
      optional_pending_assignments: 0,
    })
  })

  test('returns 404 for unknown task IDs instead of leaking ORM row-not-found errors', async ({
    assert,
    client,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()

    const response = await client
      .get('/api/tasks/00000000-0000-0000-0000-000000000000')
      .loginAs(owner)

    response.assertStatus(404)

    const body = response.body() as {
      error?: {
        code?: string
        message?: string
      }
    }

    assert.equal(body.error?.code, 'E_NOT_FOUND')
    assert.notInclude(body.error?.message ?? '', 'E_ROW_NOT_FOUND')
  })

  test('v1 task detail API returns Problem Details for unknown task IDs', async ({
    assert,
    client,
  }) => {
    const { owner } = await OrganizationFactory.createWithOwner()

    const response = await client
      .get('/api/v1/tasks/00000000-0000-0000-0000-000000000000')
      .loginAs(owner)

    response.assertStatus(404)

    const body = response.body() as {
      type?: string
      title?: string
      status?: number
      detail?: string
      code?: string
    }

    assert.equal(body.status, 404)
    assert.equal(body.code, 'E_NOT_FOUND')
    assert.notInclude(body.detail ?? '', 'E_ROW_NOT_FOUND')
  })
})
