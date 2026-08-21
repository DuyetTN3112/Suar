import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

type SubmissionStatus = 'draft' | 'submitted'

async function createScenario(status: SubmissionStatus) {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const assignee = await UserFactory.create({ current_organization_id: org.id })
  await OrganizationUserFactory.create({
    organization_id: org.id,
    user_id: assignee.id,
    org_role: 'org_member',
    status: 'approved',
  })
  const task = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    assigned_to: assignee.id,
    title: 'Legacy submission safety task',
  })
  const assignment = await TaskAssignmentFactory.create({
    task_id: task.id,
    assignee_id: assignee.id,
    assigned_by: owner.id,
    assignment_status: 'active',
  })
  const submissionId = testId()
  const now = new Date().toISOString()

  await db.table('task_submissions').insert({
    id: submissionId,
    task_assignment_id: assignment.id,
    task_id: task.id,
    submitted_by: assignee.id,
    summary: 'Original submitted work',
    status,
    submitted_at: status === 'submitted' ? now : null,
    created_at: now,
    updated_at: now,
  })

  return { org, owner, assignee, task, submissionId }
}

test.group('Integration | Task submission legacy safety', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('submitted package cannot be downgraded by the save-draft endpoint', async ({
    assert,
    client,
  }) => {
    const { assignee, task, submissionId } = await createScenario('submitted')

    const response = await client.post(`/api/tasks/${task.id}/submission`).loginAs(assignee).json({
      summary: 'Downgraded draft',
      evidences: [],
    })

    response.assertStatus(400)
    const persisted = (await db
      .from('task_submissions')
      .where('id', submissionId)
      .select('status', 'summary')
      .first()) as { status: string; summary: string }
    assert.equal(persisted.status, 'submitted')
    assert.equal(persisted.summary, 'Original submitted work')
  })

  test('draft package cannot be locked before submit-for-review', async ({ assert, client }) => {
    const { assignee, task, submissionId } = await createScenario('draft')

    const response = await client
      .post(`/api/tasks/${task.id}/submission/lock`)
      .loginAs(assignee)

    response.assertStatus(400)
    const persisted = (await db
      .from('task_submissions')
      .where('id', submissionId)
      .select('status', 'locked_at')
      .first()) as { status: string; locked_at: string | null }
    assert.equal(persisted.status, 'draft')
    assert.isNull(persisted.locked_at)
  })

  test('approved organization member cannot lock another user submission', async ({
    assert,
    client,
  }) => {
    const { org, task, submissionId } = await createScenario('submitted')
    const outsider = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: outsider.id,
      org_role: 'org_member',
      status: 'approved',
    })

    const response = await client
      .post(`/api/tasks/${task.id}/submission/lock`)
      .loginAs(outsider)

    response.assertStatus(403)
    const persisted = (await db
      .from('task_submissions')
      .where('id', submissionId)
      .select('status')
      .first()) as { status: string }
    assert.equal(persisted.status, 'submitted')
  })

  test('submitted package rejects late evidence additions', async ({ assert, client }) => {
    const { assignee, submissionId } = await createScenario('submitted')

    const response = await client
      .post(`/api/task-submissions/${submissionId}/evidences`)
      .loginAs(assignee)
      .json({
        evidenceType: 'pull_request',
        url: 'https://example.com/late-evidence',
      })

    response.assertStatus(400)
    const evidence: unknown = await db
      .from('task_submission_evidences')
      .where('submission_id', submissionId)
      .first()
    assert.isNull(evidence)
  })

  test('submitted package rejects evidence deletion', async ({ assert, client }) => {
    const { assignee, submissionId } = await createScenario('submitted')
    const evidenceId = testId()
    await db.table('task_submission_evidences').insert({
      id: evidenceId,
      submission_id: submissionId,
      evidence_type: 'pull_request',
      url: 'https://example.com/submitted-evidence',
      uploaded_by: assignee.id,
      created_at: new Date().toISOString(),
    })

    const response = await client
      .delete(`/api/task-submissions/${submissionId}/evidences/${evidenceId}`)
      .loginAs(assignee)

    response.assertStatus(400)
    const evidence: unknown = await db
      .from('task_submission_evidences')
      .where('id', evidenceId)
      .first()
    assert.isNotNull(evidence)
  })
})
