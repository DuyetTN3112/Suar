/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import GetOrganizationShowPageQuery from '#modules/organizations/actions/queries/get_organization_show_page_query'
import AcceptSprintReverseReviewWorkflowCommand from '#modules/reviews/actions/commands/accept_sprint_reverse_review_workflow_command'
import CloseProjectSprintReviewCommand from '#modules/reviews/actions/commands/close_project_sprint_review_command'
import ReportSprintReverseReviewWorkflowCommand from '#modules/reviews/actions/commands/report_sprint_reverse_review_workflow_command'
import RespondSprintReverseReviewWorkflowCommand from '#modules/reviews/actions/commands/respond_sprint_reverse_review_workflow_command'
import StartAiDisputeEvaluationCommand from '#modules/reviews/actions/commands/start_ai_dispute_evaluation_command'
import SubmitSprintReverseReviewWorkflowCommand from '#modules/reviews/actions/commands/submit_sprint_reverse_review_workflow_command'
import GetSprintReverseReviewBoardQuery from '#modules/reviews/actions/queries/get_sprint_reverse_review_board_query'
import ProjectSprint from '#modules/reviews/infra/models/project_sprint'
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

function makeContext(userId: string, organizationId: string) {
  return {
    userId,
    organizationId,
    ip: '127.0.0.1',
    userAgent: 'test',
  }
}

function requireTestValue<T>(value: T | null | undefined, label: string): T {
  if (value === null || value === undefined) {
    throw new Error(`Missing ${label}`)
  }
  return value
}

function restoreEnvValue(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key]
    return
  }
  process.env[key] = value
}

function requestInfoUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

function requestBodyText(body: BodyInit | null | undefined): string {
  if (typeof body === 'string') return body
  if (body === null || body === undefined) return ''
  throw new Error('Expected string request body')
}

function parseMetadata(value: unknown): Record<string, unknown> {
  return typeof value === 'string'
    ? (JSON.parse(value) as Record<string, unknown>)
    : ((value ?? {}) as Record<string, unknown>)
}

function recordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : []
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
    task_type: 'sprint_reverse_review_context',
    business_domain: 'trust_review',
    problem_category: 'reverse_review',
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

interface SprintReviewPackageRow {
  reviewer_id: string
}

interface SprintReverseWorkflowRow {
  reviewer_id: string
  target_type: string
  target_user_id: string | null
  target_entity_id: string | null
  responder_id: string | null
}

test.group('Integration | Sprint reverse review board', (group) => {
  group.setup(async () => {
    await setupApp()
    await cleanupTestData()
  })
  group.teardown(async () => {
    await cleanupTestData()
    await teardownApp()
  })

  test('persists sprint reverse review workflow and messages', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const reviewer = await UserFactory.create({ current_organization_id: org.id })
    const assigner = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: reviewer.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: assigner.id,
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
      name: 'Reverse Board Schema Sprint',
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
      creator_id: assigner.id,
      assigned_to: reviewer.id,
      status: 'done',
    })
    await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: reviewer.id,
      assigned_by: assigner.id,
      assignment_status: 'completed',
    })
    const packageId = testId()
    await db.table('sprint_review_packages').insert({
      id: packageId,
      sprint_id: sprint.id,
      reviewer_id: reviewer.id,
      status: 'pending',
      submitted_at: null,
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T01:00:00.000Z',
    })

    const workflowId = testId()
    await db.table('sprint_reverse_review_workflows').insert({
      id: workflowId,
      sprint_id: sprint.id,
      project_id: project.id,
      organization_id: org.id,
      reviewer_id: reviewer.id,
      target_type: 'assigner',
      target_user_id: assigner.id,
      target_entity_id: null,
      responder_id: assigner.id,
      status: 'awaiting_review',
      rating: null,
      comment: null,
      package_id: packageId,
      submitted_at: null,
      accepted_at: null,
      reported_at: null,
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T01:00:00.000Z',
    })
    await db.table('sprint_reverse_review_messages').insert({
      id: testId(),
      workflow_id: workflowId,
      author_id: reviewer.id,
      message_type: 'review',
      body: 'Task assignment was clear.',
      created_at: '2026-07-14T02:00:00.000Z',
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
      creator_id: assigner.id,
      assigned_to: reviewer.id,
      title: 'Out of scope reverse review schedule',
      status: 'todo',
      due_date: DateTime.fromISO('2026-07-10T00:00:00.000Z'),
    })
    await insertWorkHistory({
      userId: reviewer.id,
      taskId: outOfScopeTask.id,
      organizationId: org.id,
      projectId: outOfScopeProject.id,
      taskTitle: 'Out of scope reverse review history',
      completedAt: '2026-07-20T00:00:00.000Z',
    })

    const workflow = await db
      .from('sprint_reverse_review_workflows')
      .where('id', workflowId)
      .firstOrFail()
    const message = await db
      .from('sprint_reverse_review_messages')
      .where('workflow_id', workflowId)
      .firstOrFail()

    assert.equal(workflow.status, 'awaiting_review')
    assert.equal(workflow.target_type, 'assigner')
    assert.equal(message.message_type, 'review')

    await db
      .from('sprint_reverse_review_workflows')
      .where('id', workflowId)
      .update({ status: 'disputed' })
    await new ReportSprintReverseReviewWorkflowCommand(makeContext(assigner.id, org.id)).execute({
      workflow_id: workflowId,
      body: 'Escalate unresolved assigner review.',
    })
    const reportMessage = await db
      .from('sprint_reverse_review_messages')
      .where('workflow_id', workflowId)
      .where('message_type', 'report')
      .firstOrFail()
    const reportContext = parseMetadata(reportMessage.metadata)['runtime_context'] as Record<
      string,
      unknown
    >
    assert.equal(reportContext['dispute_review_type'], 'manager_review')
    assert.equal((reportContext['organization'] as Record<string, unknown>)['id'], org.id)
    assert.equal((reportContext['project'] as Record<string, unknown>)['id'], project.id)
    assert.include(
      recordArray(reportContext['sprint_peer_tasks']).map((peerTask) => peerTask['id']),
      task.id
    )
    assert.include(
      recordArray(reportContext['manager_assigned_tasks']).map(
        (assignedTask) => assignedTask['id']
      ),
      task.id
    )
    const reviewerContext = reportContext['reviewer_context'] as Record<string, unknown>
    assert.notInclude(
      recordArray(reviewerContext['work_schedule']).map((scheduleTask) => scheduleTask['id']),
      outOfScopeTask.id
    )
    assert.notInclude(
      recordArray(reviewerContext['task_history']).map((history) => history['task_id']),
      outOfScopeTask.id
    )
  })

  test('blocks sprint close while task review workflows are not done', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const worker = await UserFactory.create({ current_organization_id: org.id })
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
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Blocked Task Review Sprint',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      project_sprint_id: sprint.id,
      creator_id: owner.id,
      assigned_to: worker.id,
      status: 'done',
    })
    await db.table('task_review_workflows').insert({
      id: testId(),
      task_id: task.id,
      project_id: project.id,
      organization_id: org.id,
      reviewee_id: worker.id,
      status: 'awaiting_response',
      required_review_count: 2,
      completed_review_count: 2,
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T01:00:00.000Z',
    })

    await assert.rejects(
      () =>
        new CloseProjectSprintReviewCommand(makeContext(owner.id, org.id)).execute({
          sprint_id: sprint.id,
        }),
      /Cannot close sprint while task reviews are not done/
    )
  })

  test('opens reverse review workflows for eligible reviewers and creates next sprint', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const assignerA = await UserFactory.create({ current_organization_id: org.id })
    const assignerB = await UserFactory.create({ current_organization_id: org.id })
    const worker = await UserFactory.create({ current_organization_id: org.id })
    const memberOnly = await UserFactory.create({ current_organization_id: org.id })
    const outsideWorker = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: assignerA.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: assignerB.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: worker.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: memberOnly.id,
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
      user_id: worker.id,
      project_role: 'project_member',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: memberOnly.id,
      project_role: 'project_member',
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Reverse Review Sprint 1',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    const tasks = [
      await TaskFactory.create({
        organization_id: org.id,
        project_id: project.id,
        project_sprint_id: sprint.id,
        creator_id: assignerA.id,
        assigned_to: worker.id,
        status: 'done',
      }),
      await TaskFactory.create({
        organization_id: org.id,
        project_id: project.id,
        project_sprint_id: sprint.id,
        creator_id: assignerA.id,
        assigned_to: worker.id,
        status: 'done',
      }),
      await TaskFactory.create({
        organization_id: org.id,
        project_id: project.id,
        project_sprint_id: sprint.id,
        creator_id: assignerB.id,
        assigned_to: outsideWorker.id,
        status: 'done',
      }),
    ]
    const firstTask = requireTestValue(tasks[0], 'first task fixture')
    const secondTask = requireTestValue(tasks[1], 'second task fixture')
    const thirdTask = requireTestValue(tasks[2], 'third task fixture')
    await TaskAssignmentFactory.create({
      task_id: firstTask.id,
      assignee_id: worker.id,
      assigned_by: assignerA.id,
      assignment_status: 'completed',
    })
    await TaskAssignmentFactory.create({
      task_id: secondTask.id,
      assignee_id: worker.id,
      assigned_by: assignerA.id,
      assignment_status: 'completed',
    })
    await TaskAssignmentFactory.create({
      task_id: thirdTask.id,
      assignee_id: outsideWorker.id,
      assigned_by: assignerB.id,
      assignment_status: 'completed',
    })
    for (const task of tasks) {
      await db.table('task_review_workflows').insert({
        id: testId(),
        task_id: task.id,
        project_id: project.id,
        organization_id: org.id,
        reviewee_id: task.assigned_to,
        status: 'done',
        required_review_count: 2,
        completed_review_count: 2,
        created_at: '2026-07-14T01:00:00.000Z',
        updated_at: '2026-07-14T01:00:00.000Z',
      })
    }

    const result = await new CloseProjectSprintReviewCommand(makeContext(owner.id, org.id)).execute(
      { sprint_id: sprint.id }
    )

    const packages = (await db
      .from('sprint_review_packages')
      .where('sprint_id', sprint.id)
      .select('reviewer_id')) as SprintReviewPackageRow[]
    const workflows = (await db
      .from('sprint_reverse_review_workflows')
      .where('sprint_id', sprint.id)
      .orderBy('reviewer_id', 'asc')
      .orderBy('target_type', 'asc')
      .select(
        'reviewer_id',
        'target_type',
        'target_user_id',
        'target_entity_id',
        'responder_id'
      )) as SprintReverseWorkflowRow[]
    const nextSprint = await db
      .from('project_sprints')
      .where('project_id', project.id)
      .whereNot('id', sprint.id)
      .first()

    assert.equal(result.status, 'review_open')
    assert.sameMembers(
      packages.map((row) => row.reviewer_id),
      [assignerA.id, assignerB.id, worker.id, outsideWorker.id]
    )
    assert.exists(
      workflows.find(
        (row) =>
          row.reviewer_id === worker.id &&
          row.target_type === 'assigner' &&
          row.target_user_id === assignerA.id
      )
    )
    assert.exists(
      workflows.find(
        (row) =>
          row.reviewer_id === outsideWorker.id &&
          row.target_type === 'assigner' &&
          row.target_user_id === assignerB.id
      )
    )
    const environmentWorkflow = workflows.find(
      (row) => row.reviewer_id === worker.id && row.target_type === 'environment'
    )
    const requiredEnvironmentWorkflow = requireTestValue(
      environmentWorkflow,
      'environment workflow'
    )
    assert.exists(environmentWorkflow)
    assert.equal(requiredEnvironmentWorkflow.target_entity_id, org.id)
    assert.equal(requiredEnvironmentWorkflow.responder_id, owner.id)
    assert.exists(nextSprint)
    assert.equal(requireTestValue(nextSprint, 'next sprint').status, 'active')
  })

  test('blocks next sprint close while previous sprint reverse reviews are not done', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const worker = await UserFactory.create({ current_organization_id: org.id })
    const otherWorker = await UserFactory.create({ current_organization_id: org.id })
    const assigner = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: worker.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: otherWorker.id,
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
    const previousSprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Previous Sprint',
      status: 'review_open',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: owner.id,
      review_opened_at: DateTime.fromISO('2026-07-14T01:00:00.000Z'),
      review_closed_at: null,
    })
    await db.table('sprint_reverse_review_workflows').insert({
      id: testId(),
      sprint_id: previousSprint.id,
      project_id: project.id,
      organization_id: org.id,
      reviewer_id: worker.id,
      target_type: 'environment',
      target_user_id: null,
      target_entity_id: org.id,
      responder_id: owner.id,
      status: 'awaiting_response',
      rating: 4,
      comment: 'Need clearer coordination.',
      package_id: null,
      submitted_at: '2026-07-14T02:00:00.000Z',
      accepted_at: null,
      reported_at: null,
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T02:00:00.000Z',
    })
    const currentSprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Current Sprint',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-28T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    const tasks = [
      await TaskFactory.create({
        organization_id: org.id,
        project_id: project.id,
        project_sprint_id: currentSprint.id,
        creator_id: assigner.id,
        assigned_to: worker.id,
        status: 'done',
      }),
      await TaskFactory.create({
        organization_id: org.id,
        project_id: project.id,
        project_sprint_id: currentSprint.id,
        creator_id: assigner.id,
        assigned_to: otherWorker.id,
        status: 'done',
      }),
    ]
    for (const task of tasks) {
      const assigneeId = requireTestValue(task.assigned_to, 'task assignee')
      await TaskAssignmentFactory.create({
        task_id: task.id,
        assignee_id: assigneeId,
        assigned_by: assigner.id,
        assignment_status: 'completed',
      })
      await db.table('task_review_workflows').insert({
        id: testId(),
        task_id: task.id,
        project_id: project.id,
        organization_id: org.id,
        reviewee_id: task.assigned_to,
        status: 'done',
        required_review_count: 2,
        completed_review_count: 2,
        created_at: '2026-07-28T01:00:00.000Z',
        updated_at: '2026-07-28T01:00:00.000Z',
      })
    }

    await assert.rejects(
      () =>
        new CloseProjectSprintReviewCommand(makeContext(owner.id, org.id)).execute({
          sprint_id: currentSprint.id,
        }),
      /Cannot close sprint while previous review sau sprint workflows are not done/
    )
  })

  test('projects assigner and shared environment workflows into review boards', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const assigner = await UserFactory.create({ current_organization_id: org.id })
    const worker = await UserFactory.create({ current_organization_id: org.id })
    const otherWorker = await UserFactory.create({ current_organization_id: org.id })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: assigner.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: worker.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: otherWorker.id,
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
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Board Projection Sprint',
      status: 'active',
      starts_at: DateTime.fromISO('2026-07-01T00:00:00.000Z'),
      ends_at: DateTime.fromISO('2026-07-14T00:00:00.000Z'),
      created_by: owner.id,
      closed_by: null,
      review_opened_at: null,
      review_closed_at: null,
    })
    const tasks = [
      await TaskFactory.create({
        organization_id: org.id,
        project_id: project.id,
        project_sprint_id: sprint.id,
        creator_id: assigner.id,
        assigned_to: worker.id,
        status: 'done',
      }),
      await TaskFactory.create({
        organization_id: org.id,
        project_id: project.id,
        project_sprint_id: sprint.id,
        creator_id: assigner.id,
        assigned_to: worker.id,
        status: 'done',
      }),
      await TaskFactory.create({
        organization_id: org.id,
        project_id: project.id,
        project_sprint_id: sprint.id,
        creator_id: owner.id,
        assigned_to: otherWorker.id,
        status: 'done',
      }),
    ]
    for (const task of tasks) {
      const assigneeId = requireTestValue(task.assigned_to, 'task assignee')
      await TaskAssignmentFactory.create({
        task_id: task.id,
        assignee_id: assigneeId,
        assigned_by: task.creator_id,
        assignment_status: 'completed',
      })
      await db.table('task_review_workflows').insert({
        id: testId(),
        task_id: task.id,
        project_id: project.id,
        organization_id: org.id,
        reviewee_id: task.assigned_to,
        status: 'done',
        required_review_count: 2,
        completed_review_count: 2,
        created_at: '2026-07-14T01:00:00.000Z',
        updated_at: '2026-07-14T01:00:00.000Z',
      })
    }
    await new CloseProjectSprintReviewCommand(makeContext(owner.id, org.id)).execute({
      sprint_id: sprint.id,
    })

    const board = await new GetSprintReverseReviewBoardQuery(makeContext(worker.id, org.id)).handle(
      { sprint_id: sprint.id }
    )
    assert.property(board.assigner.columns, 'in_review')
    assert.property(board.environment.columns, 'in_review')

    const assignerCards = board.assigner.columns.awaiting_review.cards
    const environmentCards = board.environment.columns.awaiting_review.cards

    assert.lengthOf(assignerCards, 1)
    const assignerCard = requireTestValue(assignerCards[0], 'assigner card')
    const environmentCard = requireTestValue(environmentCards[0], 'environment card')
    const firstRelatedTask = requireTestValue(tasks[0], 'first related task')
    const secondRelatedTask = requireTestValue(tasks[1], 'second related task')
    assert.equal(assignerCard.target_user_id, assigner.id)
    assert.equal(assignerCard.related_task_count, 2)
    assert.lengthOf(assignerCard.related_tasks, 2)
    assert.sameMembers(
      assignerCard.related_tasks.map((task) => task.id),
      [firstRelatedTask.id, secondRelatedTask.id]
    )
    assert.equal(assignerCard.target_user?.id, assigner.id)
    assert.equal(assignerCard.target_user?.username, assigner.username)
    assert.lengthOf(environmentCards, 1)
    assert.equal(environmentCard.target_type, 'environment')
    assert.equal(environmentCard.target_entity_id, org.id)
    assert.equal(environmentCard.responder_id, owner.id)
    assert.equal(environmentCard.responder?.id, owner.id)
  })

  test('supports submit, dispute, accept, and report workflow actions', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const worker = await UserFactory.create({ current_organization_id: org.id })
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const sprint = await ProjectSprint.create({
      id: testId(),
      organization_id: org.id,
      project_id: project.id,
      name: 'Action Sprint',
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
      assigned_to: worker.id,
      status: 'done',
    })
    const packageId = testId()
    await db.table('sprint_review_packages').insert({
      id: packageId,
      sprint_id: sprint.id,
      reviewer_id: worker.id,
      status: 'pending',
      submitted_at: null,
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T01:00:00.000Z',
    })
    const workflowId = testId()
    await db.table('sprint_reverse_review_workflows').insert({
      id: workflowId,
      sprint_id: sprint.id,
      project_id: project.id,
      organization_id: org.id,
      reviewer_id: worker.id,
      target_type: 'environment',
      target_user_id: null,
      target_entity_id: org.id,
      responder_id: owner.id,
      status: 'awaiting_review',
      rating: null,
      comment: null,
      package_id: packageId,
      submitted_at: null,
      accepted_at: null,
      reported_at: null,
      created_at: '2026-07-14T01:00:00.000Z',
      updated_at: '2026-07-14T01:00:00.000Z',
    })

    await new SubmitSprintReverseReviewWorkflowCommand(makeContext(worker.id, org.id)).execute({
      workflow_id: workflowId,
      rating: 4,
      comment: 'Good environment, but planning could be clearer.',
    })
    let workflow = await db
      .from('sprint_reverse_review_workflows')
      .where('id', workflowId)
      .firstOrFail()
    assert.equal(workflow.status, 'awaiting_response')
    assert.equal(workflow.rating, 4)
    assert.exists(
      await db.from('sprint_environment_reviews').where('package_id', packageId).first()
    )

    await new RespondSprintReverseReviewWorkflowCommand(makeContext(owner.id, org.id)).execute({
      workflow_id: workflowId,
      body: 'We need more context before accepting this.',
    })
    workflow = await db
      .from('sprint_reverse_review_workflows')
      .where('id', workflowId)
      .firstOrFail()
    assert.equal(workflow.status, 'disputed')

    await new AcceptSprintReverseReviewWorkflowCommand(makeContext(worker.id, org.id)).execute({
      workflow_id: workflowId,
    })
    workflow = await db
