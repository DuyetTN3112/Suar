import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import {
  insertWorkHistory,
  makeActionContext,
  parseJsonValue,
  recordArray,
} from '#modules/reviews/tests/backend/integration/support/sprint_review_packages_test_support'

import { makeStartAiDisputeEvaluationCommand } from '#composition/reviews/review-core/review_action_factory'
import ProjectSprint from '#modules/reviews/infra/models/sprint-review/project_sprint'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

test.group('Integration | Sprint review packages API - Disputes & Arbitration', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('submitted sprint review package can open dispute, exchange comments, and report to admin', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewer = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: reviewer.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: 'project_owner',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: reviewer.id,
      project_role: 'project_member',
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Reverse Dispute Sprint',
      status: 'review_open',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: owner.id,
      review_opened_at: DateTime.fromISO('2026-07-14T01:00:00.000Z'),
      review_closed_at: null,
    })
    const sprintTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: reviewer.id,
      status: 'done',
    })
    await TaskAssignmentFactory.create({
      task_id: sprintTask.id,
      assignee_id: reviewer.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    const packageId = testId()
    await db.table('sprint_review_packages').insert({
      id: packageId,
      sprint_id: sprint.id,
      reviewer_id: reviewer.id,
      status: 'submitted',
      submitted_at: '2026-07-14T02:00:00.000Z',
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T02:00:00.000Z',
    })
    await db.table('sprint_manager_reviews').insert({
      id: testId(),
      package_id: packageId,
      target_user_id: owner.id,
      target_role: 'owner',
      rating: 2,
      dimensions: JSON.stringify({ assignment_clarity: 2 }),
      comment: 'Assignment handoff missed context.',
      is_anonymous_to_target: false,
      created_at: '2026-07-14T02:00:00.000Z',
      updated_at: '2026-07-14T02:00:00.000Z',
    })
    await db.table('sprint_environment_reviews').insert({
      id: testId(),
      package_id: packageId,
      target_type: 'project',
      target_id: project.id,
      rating: 3,
      dimensions: JSON.stringify({ process: 3 }),
      comment: 'Project process context matters.',
      is_anonymous_publicly: false,
      created_at: '2026-07-14T02:00:00.000Z',
      updated_at: '2026-07-14T02:00:00.000Z',
    })
    const outOfScopeProject = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const outOfScopeTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: outOfScopeProject.id,
      project_sprint_id: null,
      creator_id: owner.id,
      assigned_to: reviewer.id,
      title: 'Out of scope sprint review schedule',
      status: 'todo',
      due_date: DateTime.fromISO('2026-07-10T00:00:00.000Z'),
    })
    await insertWorkHistory({
      userId: reviewer.id,
      taskId: outOfScopeTask.id,
      organizationId: org.id,
      projectId: outOfScopeProject.id,
      taskTitle: 'Out of scope sprint review history',
      completedAt: '2026-07-20T00:00:00.000Z',
    })

    const createResponse = await client
      .post(`/api/v1/sprint-review-packages/${packageId}/disputes`)
      .loginAs(reviewer)
      .json({
        disputeReason: 'Manager review target list missed sprint support context.',
        disputeReviewType: 'manager_review',
        requestedOutcome: 'add_context',
      })
    createResponse.assertStatus(201)

    const created = createResponse.body() as {
      data: { id: string; packageId: string; status: string; disputeReviewType: string }
    }
    assert.equal(created.data.packageId, packageId)
    assert.equal(created.data.status, 'pending')
    assert.equal(created.data.disputeReviewType, 'manager_review')

    const earlyReport = await client
      .post(`/api/v1/sprint-review-disputes/${created.data.id}/report`)
      .loginAs(reviewer)
      .json({ escalationReason: 'Need admin before exchange.' })
    earlyReport.assertStatus(400)

    const reviewerComment = await client
      .post(`/api/v1/sprint-review-disputes/${created.data.id}/comments`)
      .loginAs(reviewer)
      .json({ body: 'I reviewed current sprint reality, but target evidence is incomplete.' })
    reviewerComment.assertStatus(201)

    const ownerComment = await client
      .post(`/api/v1/sprint-review-disputes/${created.data.id}/comments`)
      .loginAs(owner)
      .json({ body: 'Org side acknowledges assignment evidence and will attach context.' })
    ownerComment.assertStatus(201)

    await UserFactory.createSuperadmin()

    const reportResponse = await client
      .post(`/api/v1/sprint-review-disputes/${created.data.id}/report`)
      .loginAs(reviewer)
      .json({ escalationReason: 'Two-side exchange did not resolve the context mismatch.' })
    reportResponse.assertStatus(201)

    const reported = reportResponse.body() as {
      data: { id: string; status: string }
    }
    assert.equal(reported.data.id, created.data.id)
    assert.equal(reported.data.status, 'admin_reviewing')
    const runtimeRow = (await db
      .from('sprint_review_disputes')
      .where('id', created.data.id)
      .select('runtime_context')
      .firstOrFail()) as { runtime_context: unknown }
    const runtimeContext = parseJsonValue(runtimeRow.runtime_context)
    assert.equal(runtimeContext['dispute_review_type'], 'manager_review')
    assert.equal((runtimeContext['organization'] as Record<string, unknown>)['id'], org.id)
    assert.equal((runtimeContext['project'] as Record<string, unknown>)['id'], project.id)
    assert.equal((runtimeContext['sprint'] as Record<string, unknown>)['id'], sprint.id)
    assert.include(
      recordArray(runtimeContext['sprint_peer_tasks']).map(
        (task: Record<string, unknown>) => task['id']
      ),
      sprintTask.id
    )
    assert.include(
      recordArray(runtimeContext['manager_reviews']).map(
        (review: Record<string, unknown>) => review['target_user_id']
      ),
      owner.id
    )
    assert.lengthOf(runtimeContext['environment_reviews'] as Array<Record<string, unknown>>, 1)
    const reviewerContext = runtimeContext['reviewer_context'] as Record<string, unknown>
    assert.notInclude(
      recordArray(reviewerContext['work_schedule']).map(
        (task: Record<string, unknown>) => task['id']
      ),
      outOfScopeTask.id
    )
    assert.notInclude(
      recordArray(reviewerContext['task_history']).map(
        (history: Record<string, unknown>) => history['task_id']
      ),
      outOfScopeTask.id
    )
    const aiEvaluation = (await db
      .from('ai_dispute_evaluations')
      .where('source_type', 'sprint_review_dispute')
      .where('source_id', created.data.id)
      .firstOrFail()) as Record<string, unknown>
    const aiPayload = parseJsonValue(aiEvaluation['request_payload'])
    assert.equal(aiEvaluation['provider'], 'clawagent')
    assert.equal(aiEvaluation['status'], 'queued')
    assert.equal(aiPayload['dispute_review_type'], 'manager_review')
    assert.equal((aiPayload['organization'] as Record<string, unknown>)['id'], org.id)

    const detailResponse = await client
      .get(`/api/v1/sprint-review-packages/${packageId}`)
      .loginAs(reviewer)
    detailResponse.assertStatus(200)
    const detailBody = detailResponse.body() as {
      data: {
        dispute: {
          id: string
          status: string
          comments: Array<{ body: string; authorContext: string }>
          canReportToAdmin: boolean
        } | null
      }
    }
    assert.equal(detailBody.data.dispute?.id, created.data.id)
    assert.equal(detailBody.data.dispute?.status, 'admin_reviewing')
    assert.lengthOf(detailBody.data.dispute?.comments ?? [], 2)
    assert.isFalse(detailBody.data.dispute?.canReportToAdmin)
  })

  test('report stages the canonical Clawagent contract for sprint review disputes', async ({
    assert,
    client,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewer = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: reviewer.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: owner.id,
      project_role: 'project_owner',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: reviewer.id,
      project_role: 'project_member',
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Sprint Production Arbitration',
      status: 'review_open',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: owner.id,
      review_opened_at: DateTime.fromISO('2026-07-14T01:00:00.000Z'),
      review_closed_at: null,
    })
    const sprintTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: reviewer.id,
      title: 'Sprint production arbitration task',
      status: 'done',
    })
    await insertWorkHistory({
      userId: reviewer.id,
      taskId: sprintTask.id,
      organizationId: org.id,
      projectId: project.id,
      taskTitle: sprintTask.title,
      completedAt: '2026-07-12T00:00:00.000Z',
    })
    const packageId = testId()
    await db.table('sprint_review_packages').insert({
      id: packageId,
      sprint_id: sprint.id,
      reviewer_id: reviewer.id,
      status: 'submitted',
      submitted_at: '2026-07-14T02:00:00.000Z',
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T02:00:00.000Z',
    })

    const createResponse = await client
      .post(`/api/v1/sprint-review-packages/${packageId}/disputes`)
      .loginAs(reviewer)
      .json({
        disputeReason: 'Manager review missed production arbitration evidence.',
        disputeReviewType: 'manager_review',
        requestedOutcome: 'add_context',
      })
    createResponse.assertStatus(201)
    const created = createResponse.body() as { data: { id: string } }

    const reviewerComment = await client
      .post(`/api/v1/sprint-review-disputes/${created.data.id}/comments`)
      .loginAs(reviewer)
      .json({ body: 'Reviewer side asks AI to inspect the sprint context.' })
    reviewerComment.assertStatus(201)
    const ownerComment = await client
      .post(`/api/v1/sprint-review-disputes/${created.data.id}/comments`)
      .loginAs(owner)
      .json({ body: 'Owner side provided counter context for arbitration.' })
    ownerComment.assertStatus(201)
    await UserFactory.createSuperadmin()

    const reportResponse = await client
      .post(`/api/v1/sprint-review-disputes/${created.data.id}/report`)
      .loginAs(reviewer)
      .json({ escalationReason: 'Two-side exchange needs AI arbitration.' })
    reportResponse.assertStatus(201)

    const aiResult = (await db
      .from('ai_dispute_evaluations')
      .where('source_type', 'sprint_review_dispute')
      .where('source_id', created.data.id)
      .firstOrFail()) as Record<string, unknown>
    const triggerPayload = parseJsonValue(aiResult['trigger_payload']) as {
      evaluation_id: string
      source_type: string
      source_id: string
      case_file_id: string | null
      callbackUrl: string
      context: {
        source_type: string
        source_id: string
        dispute_review_type: string
        organization: { id: string }
      }
    }
    assert.equal(triggerPayload.source_type, 'sprint_review_dispute')
    assert.equal(triggerPayload.source_id, created.data.id)
    assert.isNull(triggerPayload.case_file_id)
    assert.match(triggerPayload.callbackUrl, /\/api\/public\/ai-disputes\/callback$/u)
    assert.equal(triggerPayload.context.source_type, 'sprint_review_dispute')
    assert.equal(triggerPayload.context.source_id, created.data.id)
    assert.equal(triggerPayload.context.dispute_review_type, 'manager_review')
    assert.equal(triggerPayload.context.organization.id, org.id)

    const row = (await db
      .from('sprint_review_disputes')
      .where('id', created.data.id)
      .select('status')
      .firstOrFail()) as Record<string, unknown>

    assert.equal(aiResult['status'], 'queued')
    assert.isNull(aiResult['external_run_id'])
    assert.equal(row['status'], 'admin_reviewing')
  })

  test('admin can queue AI evaluation from sprint review dispute runtime context', async ({
    assert,
  }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewer = await UserFactory.create({ current_organization_id: org.id })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Sprint AI Runtime Context',
      status: 'review_open',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: owner.id,
      review_opened_at: DateTime.fromISO('2026-07-14T01:00:00.000Z'),
      review_closed_at: null,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: reviewer.id,
      title: 'Manager review context task',
      status: 'done',
    })
    const packageId = testId()
    const disputeId = testId()
    const runtimeContext = {
      schema_version: 'suar_sprint_review_dispute_runtime_context_v1',
      dispute_review_type: 'manager_review',
      organization: { id: org.id, name: org.name },
      project: { id: project.id, name: project.name },
      sprint: { id: sprint.id, name: sprint.name },
      sprint_peer_tasks: [{ id: task.id, project_sprint_id: sprint.id, title: task.title }],
      manager_reviews: [{ target_user_id: owner.id, rating: 2 }],
      environment_reviews: [],
    }

    await db.table('sprint_review_packages').insert({
      id: packageId,
      sprint_id: sprint.id,
      reviewer_id: reviewer.id,
      status: 'submitted',
      submitted_at: '2026-07-14T02:00:00.000Z',
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T02:00:00.000Z',
    })
    await db.table('sprint_review_disputes').insert({
      id: disputeId,
      package_id: packageId,
      opened_by: reviewer.id,
      status: 'admin_reviewing',
      dispute_reason: 'Manager review missed sprint task context.',
      dispute_review_type: 'manager_review',
      requested_outcome: 'add_context',
      escalation_reason: 'Need AI to inspect runtime context.',
      reported_to_admin_at: '2026-07-14T03:00:00.000Z',
      reported_to_admin_by: reviewer.id,
      runtime_context: JSON.stringify(runtimeContext),
      created_at: '2026-07-14T02:30:00.000Z',
      updated_at: '2026-07-14T03:00:00.000Z',
    })

    const result = (await makeStartAiDisputeEvaluationCommand(
      makeActionContext(superadmin.id, org.id)
    ).execute({
      dispute_id: disputeId,
      provider: 'ai_council',
    })) as unknown as Record<string, unknown>
    const requestPayload = result['request_payload'] as Record<string, unknown>
    const row = (await db
      .from('ai_dispute_evaluations')
      .where('id', result['id'] as string)
      .select('source_type', 'source_id', 'case_file_id')
      .firstOrFail()) as Record<string, unknown>

    assert.equal(result['source_type'], 'sprint_review_dispute')
    assert.isNull(result['case_file_id'])
    assert.equal(requestPayload['dispute_review_type'], 'manager_review')
    assert.equal((requestPayload['organization'] as Record<string, unknown>)['id'], org.id)
    assert.include(
      recordArray(requestPayload['sprint_peer_tasks']).map(
        (peerTask: Record<string, unknown>) => peerTask['id']
      ),
      task.id
    )
    assert.equal(row['source_type'], 'sprint_review_dispute')
    assert.equal(row['source_id'], disputeId)
    assert.isNull(row['case_file_id'])
  })
})
