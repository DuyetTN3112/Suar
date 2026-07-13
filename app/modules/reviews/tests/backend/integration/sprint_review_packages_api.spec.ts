import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { makeStartAiDisputeEvaluationCommand } from '#composition/reviews/review-core/review_action_factory'
import CloseProjectSprintReviewCommand from '#modules/reviews/actions/commands/sprint-review/close_project_sprint_review_command'
import LucidReviewSprintPackageMutationUnitOfWork from '#modules/reviews/infra/adapters/sprint-review/lucid_review_sprint_package_mutation_unit_of_work'
import { NodeReviewCryptography } from '#modules/reviews/infra/adapters/review-core/node_review_cryptography'
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

const reviewCryptography = new NodeReviewCryptography()
const sprintPackageMutationUnitOfWork = new LucidReviewSprintPackageMutationUnitOfWork()

function parseJsonValue(value: unknown): Record<string, unknown> {
  return typeof value === 'string'
    ? (JSON.parse(value) as Record<string, unknown>)
    : ((value ?? {}) as Record<string, unknown>)
}

function recordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : []
}

function makeActionContext(userId: string, organizationId: string) {
  return {
    userId,
    organizationId,
    ip: '127.0.0.1',
    userAgent: 'test',
  }
}

function requireTestValue<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`Missing ${label}`)
  }
  return value
}

async function insertWorkHistory(input: {
  userId: string
  taskId: string
  organizationId: string
  projectId: string
  taskTitle: string
  completedAt: string
}) {
  await db.table('user_work_history').insert({
    id: testId(),
    user_id: input.userId,
    task_id: input.taskId,
    task_assignment_id: testId(),
    organization_id: input.organizationId,
    project_id: input.projectId,
    task_title: input.taskTitle,
    task_type: 'sprint_review_context',
    business_domain: 'trust_review',
    problem_category: 'review_dispute',
    role_in_task: 'reviewer',
    autonomy_level: null,
    collaboration_type: 'team',
    tech_stack: JSON.stringify([]),
    domain_tags: JSON.stringify(['review']),
    difficulty: 'medium',
    estimated_hours: 4,
    actual_hours: 3,
    was_on_time: true,
    days_early_or_late: -1,
    measurable_outcomes: JSON.stringify([]),
    estimated_business_value: null,
    knowledge_artifacts: JSON.stringify([]),
    overall_quality_score: 4,
    skill_scores: JSON.stringify([]),
    evidence_links: JSON.stringify([]),
    is_featured: false,
    is_public: true,
    completed_at: input.completedAt,
  })
}

test.group('Integration | Sprint review packages API', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('lists current user pending sprint review packages', async ({ assert, client }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewer = await UserFactory.create({ current_organization_id: org.id })
    const otherReviewer = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: reviewer.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: otherReviewer.id,
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
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: otherReviewer.id,
      project_role: 'project_member',
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Pending Review Sprint',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    const reviewerTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: reviewer.id,
      status: 'done',
    })
    const otherReviewerTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: otherReviewer.id,
      status: 'done',
    })
    await TaskAssignmentFactory.create({
      task_id: reviewerTask.id,
      assignee_id: reviewer.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    await TaskAssignmentFactory.create({
      task_id: otherReviewerTask.id,
      assignee_id: otherReviewer.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    await new CloseProjectSprintReviewCommand(
      {
        userId: owner.id,
        organizationId: org.id,
        ip: '127.0.0.1',
        userAgent: 'test',
      },
      reviewCryptography,
      sprintPackageMutationUnitOfWork
    ).execute({ sprint_id: sprint.id })

    const otherPackage = (await db
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)
      .where('reviewer_id', otherReviewer.id)
      .firstOrFail()) as { id: string }
    await db
      .from('sprint_review_packages')
      .where('id', otherPackage.id)
      .update({ status: 'submitted', submitted_at: '2026-07-14T02:00:00.000Z' })

    const response = await client.get('/api/v1/me/sprint-review-packages/pending').loginAs(reviewer)

    response.assertStatus(200)
    const body = response.body() as {
      data: Array<{
        id: string
        sprintId: string
        reviewerId: string
        status: string
        sprintName: string
        projectId: string
        projectName: string
        organizationId: string
      }>
    }

    assert.lengthOf(body.data, 1)
    const row = requireTestValue(body.data[0], 'pending review package')
    assert.equal(row.sprintId, sprint.id)
    assert.equal(row.reviewerId, reviewer.id)
    assert.equal(row.status, 'pending')
    assert.equal(row.sprintName, 'Pending Review Sprint')
    assert.equal(row.projectId, project.id)
    assert.equal(row.projectName, project.name)
    assert.equal(row.organizationId, org.id)
  })

  test('shows sprint review package form context with eligible manager targets', async ({
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
      name: 'Package Detail Sprint',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    const reviewerTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: reviewer.id,
      status: 'done',
    })
    await TaskAssignmentFactory.create({
      task_id: reviewerTask.id,
      assignee_id: reviewer.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    await new CloseProjectSprintReviewCommand(
      {
        userId: owner.id,
        organizationId: org.id,
        ip: '127.0.0.1',
        userAgent: 'test',
      },
      reviewCryptography,
      sprintPackageMutationUnitOfWork
    ).execute({ sprint_id: sprint.id })
    const reviewPackage = (await db
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)
      .where('reviewer_id', reviewer.id)
      .firstOrFail()) as { id: string }

    const response = await client
      .get(`/api/v1/sprint-review-packages/${reviewPackage.id}`)
      .loginAs(reviewer)

    response.assertStatus(200)

    const body = response.body() as {
      data: {
        id: string
        sprintId: string
        reviewerId: string
        status: string
        projectTarget: { id: string; name: string }
        organizationTarget: { id: string; name: string }
        eligibleManagerTargets: Array<{ userId: string; targetRole: string }>
      }
    }

    assert.equal(body.data.id, reviewPackage.id)
    assert.equal(body.data.sprintId, sprint.id)
    assert.equal(body.data.reviewerId, reviewer.id)
    assert.equal(body.data.status, 'pending')
    assert.equal(body.data.projectTarget.id, project.id)
    assert.equal(body.data.projectTarget.name, project.name)
    assert.equal(body.data.organizationTarget.id, org.id)
    assert.equal(body.data.organizationTarget.name, org.name)
    const ownerTarget = body.data.eligibleManagerTargets.find(
      (target) => target.userId === owner.id
    )
    assert.equal(requireTestValue(ownerTarget, 'owner target').targetRole, 'owner')
  })

  test('lists submitted sprint review packages and shows read-only submitted reviews', async ({
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
      name: 'Submitted Package Sprint',
      status: 'review_open',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: owner.id,
      review_opened_at: DateTime.fromISO('2026-07-14T01:00:00.000Z'),
      review_closed_at: null,
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
      rating: 5,
      dimensions: JSON.stringify({ clarity: 5 }),
      comment: 'Clear sprint direction.',
      is_anonymous_to_target: true,
      created_at: '2026-07-14T02:00:00.000Z',
      updated_at: '2026-07-14T02:00:00.000Z',
    })
    await db.table('sprint_environment_reviews').insert([
      {
        id: testId(),
        package_id: packageId,
        target_type: 'project',
        target_id: project.id,
        rating: 4,
        dimensions: JSON.stringify({ process: 4 }),
        comment: 'Project flow was stable.',
        is_anonymous_publicly: true,
        created_at: '2026-07-14T02:00:00.000Z',
        updated_at: '2026-07-14T02:00:00.000Z',
      },
      {
        id: testId(),
        package_id: packageId,
        target_type: 'organization',
        target_id: org.id,
        rating: 3,
        dimensions: JSON.stringify({ support: 3 }),
        comment: 'Org support was acceptable.',
        is_anonymous_publicly: false,
        created_at: '2026-07-14T02:00:00.000Z',
        updated_at: '2026-07-14T02:00:00.000Z',
      },
    ])

    const listResponse = await client.get('/api/v1/me/sprint-review-packages').loginAs(reviewer)

    listResponse.assertStatus(200)
    const listBody = listResponse.body() as {
      data: Array<{ id: string; status: string; sprintName: string; submittedAt: string | null }>
    }
    assert.equal(listBody.data[0]?.id, packageId)
    assert.equal(listBody.data[0]?.status, 'submitted')
    assert.equal(listBody.data[0]?.sprintName, 'Submitted Package Sprint')
    assert.equal(listBody.data[0]?.submittedAt, '2026-07-14T02:00:00.000Z')

    const detailResponse = await client
      .get(`/api/v1/sprint-review-packages/${packageId}`)
      .loginAs(reviewer)

    detailResponse.assertStatus(200)
    const detailBody = detailResponse.body() as {
      data: {
        status: string
        managerReviews: Array<{
          targetUserId: string
          targetRole: string
          rating: number
          comment: string
        }>
        environmentReviews: Array<{ targetType: string; rating: number; comment: string }>
      }
    }

    assert.equal(detailBody.data.status, 'submitted')
    assert.lengthOf(detailBody.data.managerReviews, 1)
    const managerReview = requireTestValue(
      detailBody.data.managerReviews[0],
      'manager review'
    )
    assert.equal(managerReview.targetUserId, owner.id)
    assert.equal(managerReview.targetRole, 'owner')
    assert.equal(managerReview.rating, 5)
    assert.equal(managerReview.comment, 'Clear sprint direction.')
    assert.lengthOf(detailBody.data.environmentReviews, 2)
    assert.sameMembers(
      detailBody.data.environmentReviews.map((review) => review.targetType),
      ['project', 'organization']
    )
  })

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
      recordArray(runtimeContext['sprint_peer_tasks']).map((task) => task['id']),
      sprintTask.id
    )
    assert.include(
      recordArray(runtimeContext['manager_reviews']).map((review) => review['target_user_id']),
      owner.id
    )
    assert.lengthOf(runtimeContext['environment_reviews'] as Array<Record<string, unknown>>, 1)
    const reviewerContext = runtimeContext['reviewer_context'] as Record<string, unknown>
    assert.notInclude(
      recordArray(reviewerContext['work_schedule']).map((task) => task['id']),
      outOfScopeTask.id
    )
    assert.notInclude(
      recordArray(reviewerContext['task_history']).map((history) => history['task_id']),
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
      recordArray(requestPayload['sprint_peer_tasks']).map((peerTask) => peerTask['id']),
      task.id
    )
    assert.equal(row['source_type'], 'sprint_review_dispute')
    assert.equal(row['source_id'], disputeId)
    assert.isNull(row['case_file_id'])
  })
})
