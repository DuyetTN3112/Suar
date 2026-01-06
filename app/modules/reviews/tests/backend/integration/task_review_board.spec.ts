import crypto from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import AcceptTaskReviewCommand from '#modules/reviews/actions/commands/accept_task_review_command'
import EnsureTaskReviewWorkflowCommand from '#modules/reviews/actions/commands/ensure_task_review_workflow_command'
import ProcessAiDisputeCallbackCommand from '#modules/reviews/actions/commands/process_ai_dispute_callback_command'
import ReportTaskReviewDisputeCommand from '#modules/reviews/actions/commands/report_task_review_dispute_command'
import RespondToTaskReviewCommand from '#modules/reviews/actions/commands/respond_to_task_review_command'
import SubmitTaskReviewCommand from '#modules/reviews/actions/commands/submit_task_review_command'
import GetAdminReviewDisputeDetailQuery from '#modules/reviews/actions/queries/get_admin_review_dispute_detail_query'
import GetTaskReviewBoardQuery from '#modules/reviews/actions/queries/get_task_review_board_query'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import LucidAiDisputeEvaluationSourceReader from '#modules/reviews/infra/adapters/lucid_ai_dispute_evaluation_source_reader'
import LucidAiDisputeUnitOfWork from '#modules/reviews/infra/adapters/lucid_ai_dispute_unit_of_work'
import LucidReviewAdminDisputeReadModel from '#modules/reviews/infra/adapters/lucid_review_admin_dispute_read_model'
import LucidReviewConfirmationDisputeUnitOfWork from '#modules/reviews/infra/adapters/lucid_review_confirmation_dispute_unit_of_work'
import LucidReviewDisputeArtifactReader from '#modules/reviews/infra/adapters/lucid_review_dispute_artifact_reader'
import { LucidReviewTaskBoardReader } from '#modules/reviews/infra/adapters/lucid_review_task_board_reader'
import LucidReviewTaskWorkflowUnitOfWork from '#modules/reviews/infra/adapters/lucid_review_task_workflow_unit_of_work'
import { NodeReviewCryptography } from '#modules/reviews/infra/adapters/node_review_cryptography'
import type { ReviewConfirmationEntry } from '#modules/reviews/types/review_confirmation_entry'
import { TaskStatus } from '#modules/tasks/public_contracts/task_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  ReviewSessionFactory,
  SkillFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

const taskBoardReader = new LucidReviewTaskBoardReader()
const reviewCryptography = new NodeReviewCryptography()
const aiDisputeUnitOfWork = new LucidAiDisputeUnitOfWork()
const confirmationDisputes = new LucidReviewConfirmationDisputeUnitOfWork()
const taskWorkflowUnitOfWork = new LucidReviewTaskWorkflowUnitOfWork()

const makeEnsureTaskReviewWorkflowCommand = (execCtx: ReviewActionContext) =>
  new EnsureTaskReviewWorkflowCommand(execCtx, taskWorkflowUnitOfWork)
const makeReportTaskReviewDisputeCommand = (execCtx: ReviewActionContext) =>
  new ReportTaskReviewDisputeCommand(execCtx, taskWorkflowUnitOfWork)
const makeRespondToTaskReviewCommand = (execCtx: ReviewActionContext) =>
  new RespondToTaskReviewCommand(execCtx, taskWorkflowUnitOfWork)
const makeSubmitTaskReviewCommand = (execCtx: ReviewActionContext) =>
  new SubmitTaskReviewCommand(execCtx, taskWorkflowUnitOfWork)

interface TaskReviewWorkflowFixtureRow {
  task_id: string
  reviewee_id: string | null
  required_review_count: number | string
  completed_review_count?: number | string
  status?: string
  accepted_by_reviewee_at?: string | null
  completed_at?: string | null
  reported_by?: string | null
  reported_at?: string | null
  runtime_context?: unknown
}

interface TaskReviewReviewerFixtureRow {
  reviewer_id: string
  reviewer_role: string
}

interface TaskReviewMessageFixtureRow {
  body: string
  metadata?: unknown
}

function parseJsonValue(value: unknown): Record<string, unknown> {
  return typeof value === 'string'
    ? (JSON.parse(value) as Record<string, unknown>)
    : ((value ?? {}) as Record<string, unknown>)
}

function recordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : []
}

function signAiCallback(
  timestamp: number,
  evaluationId: string,
  status: 'completed' | 'failed',
  secret: string
): string {
  return crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}:${evaluationId}:${status}`)
    .digest('hex')
}

async function insertProfileAndHistory(input: {
  userId: string
  taskId: string
  assignmentId: string
  organizationId: string
  projectId: string
  role: string
}) {
  await db.table('user_profile_snapshots').insert({
    id: testId(),
    user_id: input.userId,
    version: 1,
    snapshot_name: `${input.role} profile`,
    is_current: true,
    is_public: true,
    summary: JSON.stringify({ role: input.role }),
    skills_verified: JSON.stringify([]),
    work_highlights: JSON.stringify([]),
    performance_metrics: JSON.stringify({ completed_tasks: 1 }),
    trust_metrics: JSON.stringify({ dispute_context: true }),
    scoring_version: 'tr_context_v1',
  })
  await db.table('user_work_history').insert({
    id: testId(),
    user_id: input.userId,
    task_id: input.taskId,
    task_assignment_id: input.assignmentId,
    organization_id: input.organizationId,
    project_id: input.projectId,
    task_title: `${input.role} task history`,
    task_type: 'task_review_context',
    business_domain: 'trust_review',
    problem_category: 'task_review_dispute',
    role_in_task: input.role,
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
    completed_at: new Date().toISOString(),
  })
}

function requireFixtureRow<T>(value: T | undefined, label: string): T {
  if (!value) {
    throw new Error(`Missing ${label}`)
  }
  return value
}

async function buildDoneTaskBoardScenario() {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const reviewee = await UserFactory.create({ current_organization_id: org.id })
  const otherAssignee = await UserFactory.create({ current_organization_id: org.id })
  const projectManager = await UserFactory.create({ current_organization_id: org.id })
  const viewer = await UserFactory.create({ current_organization_id: org.id })
  const project = await ProjectFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    owner_id: owner.id,
  })
  const sprintId = testId()
  await db.table('project_sprints').insert({
    id: sprintId,
    organization_id: org.id,
    project_id: project.id,
    name: 'Task review sprint',
    status: 'active',
    starts_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_by: owner.id,
  })

  for (const user of [reviewee, otherAssignee, projectManager, viewer]) {
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: user.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await ProjectMemberFactory.create({
      project_id: project.id,
      user_id: user.id,
      project_role: user.id === projectManager.id ? 'project_manager' : 'project_member',
    })
  }

  const ownDoneTask = await TaskFactory.create({
    organization_id: org.id,
    project_id: project.id,
    creator_id: owner.id,
    assigned_to: viewer.id,
    status: TaskStatus.DONE,
    title: 'Own done task visible in review board',
  })
  await TaskAssignmentFactory.create({
    task_id: ownDoneTask.id,
    assignee_id: viewer.id,
    assigned_by: owner.id,
    assignment_status: 'completed',
  })

  const otherDoneTask = await TaskFactory.create({
    organization_id: org.id,
    project_id: project.id,
    project_sprint_id: sprintId,
    creator_id: owner.id,
    assigned_to: otherAssignee.id,
    status: TaskStatus.DONE,
    title: 'Other done task visible in review board',
  })
  await TaskAssignmentFactory.create({
    task_id: otherDoneTask.id,
    assignee_id: otherAssignee.id,
    assigned_by: owner.id,
    assignment_status: 'completed',
  })

  const viewerCreatedTask = await TaskFactory.create({
    organization_id: org.id,
    project_id: project.id,
    creator_id: viewer.id,
    assigned_to: otherAssignee.id,
    status: TaskStatus.DONE,
    title: 'Viewer created task hidden from own review board',
  })
  await TaskAssignmentFactory.create({
    task_id: viewerCreatedTask.id,
    assignee_id: otherAssignee.id,
    assigned_by: viewer.id,
    assignment_status: 'completed',
  })

  const inProgressTask = await TaskFactory.create({
    organization_id: org.id,
    project_id: project.id,
    creator_id: owner.id,
    assigned_to: reviewee.id,
    status: TaskStatus.IN_PROGRESS,
    title: 'In progress task hidden from review board',
  })

  return {
    org,
    project,
    sprintId,
    owner,
    viewer,
    peerReviewer: reviewee,
    otherAssignee,
    projectManager,
    ownDoneTask,
    otherDoneTask,
    viewerCreatedTask,
    inProgressTask,
  }
}

async function buildSingleReviewerTaskReviewScenario() {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const reviewee = await UserFactory.create({ current_organization_id: org.id })
  const project = await ProjectFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    owner_id: owner.id,
  })

  await OrganizationUserFactory.create({
    organization_id: org.id,
    user_id: reviewee.id,
    org_role: 'org_member',
    status: 'approved',
  })
  await ProjectMemberFactory.create({
    project_id: project.id,
    user_id: reviewee.id,
    project_role: 'project_member',
  })

  const task = await TaskFactory.create({
    organization_id: org.id,
    project_id: project.id,
    creator_id: owner.id,
    assigned_to: reviewee.id,
    status: TaskStatus.DONE,
    title: 'Single reviewer task review',
  })
  await TaskAssignmentFactory.create({
    task_id: task.id,
    assignee_id: reviewee.id,
    assigned_by: owner.id,
    assignment_status: 'completed',
  })

  return { org, owner, reviewee, project, task }
}

test.group('Integration | Task Review Board', (group) => {
  group.setup(async () => {
    await setupApp()
    await cleanupTestData()
  })
  group.teardown(async () => {
    await cleanupTestData()
    await teardownApp()
  })

  test('awaiting_review shows all delivery-done project tasks for project review visibility', async ({
    assert,
  }) => {
    const scenario = await buildDoneTaskBoardScenario()
    const result = await new GetTaskReviewBoardQuery(
      {
        userId: scenario.viewer.id,
        ip: '0.0.0.0',
        userAgent: 'test',
        organizationId: null,
      },
      taskBoardReader
    ).execute({
      projectId: scenario.project.id,
    })

    const awaitingReview = result.columns.find((column) => column.status === 'awaiting_review')
    assert.exists(awaitingReview)

    const taskIds = awaitingReview?.cards.map((card) => card.taskId) ?? []
    assert.include(taskIds, scenario.otherDoneTask.id)
    assert.include(taskIds, scenario.ownDoneTask.id)
    assert.include(taskIds, scenario.viewerCreatedTask.id)
    assert.notInclude(taskIds, scenario.inProgressTask.id)

    assert.equal(scenario.ownDoneTask.status, TaskStatus.DONE)
    assert.equal(scenario.otherDoneTask.status, TaskStatus.DONE)
  })

  test('board access requires project-scoped visibility before task rows are read', async ({
    assert,
  }) => {
    const scenario = await buildDoneTaskBoardScenario()
    const outsider = await UserFactory.create({ current_organization_id: scenario.org.id })
    await OrganizationUserFactory.create({
      organization_id: scenario.org.id,
      user_id: outsider.id,
      org_role: 'org_member',
      status: 'approved',
    })

    await assert.rejects(
      () =>
        new GetTaskReviewBoardQuery(
          {
            userId: outsider.id,
            ip: '0.0.0.0',
            userAgent: 'test',
            organizationId: scenario.org.id,
          },
          taskBoardReader
        ).execute({
          projectId: scenario.project.id,
        }),
      ForbiddenException,
      'You do not have permission to view this task review board'
    )

    const ownerBoard = await new GetTaskReviewBoardQuery(
      {
        userId: scenario.owner.id,
        ip: '0.0.0.0',
        userAgent: 'test',
        organizationId: scenario.org.id,
      },
      taskBoardReader
    ).execute({
      projectId: scenario.project.id,
    })
    const ownerTaskIds = ownerBoard.columns.flatMap((column) =>
      column.cards.map((card) => card.taskId)
    )

    assert.include(ownerTaskIds, scenario.otherDoneTask.id)
  })

  test('ensures workflow with task giver plus highest-priority second reviewer', async ({
    assert,
  }) => {
    const scenario = await buildDoneTaskBoardScenario()

    const result = await makeEnsureTaskReviewWorkflowCommand({
      userId: scenario.viewer.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      taskId: scenario.otherDoneTask.id,
    })

    assert.equal(result.status, 'awaiting_review')
    assert.equal(result.requiredReviewCount, 2)

    const workflow = (await db
      .from('task_review_workflows')
      .where('id', result.workflowId)
      .firstOrFail()) as TaskReviewWorkflowFixtureRow

    assert.equal(workflow.task_id, scenario.otherDoneTask.id)
    assert.equal(workflow.reviewee_id, scenario.otherDoneTask.assigned_to)
    assert.equal(workflow.required_review_count, 2)

    const reviewers = (await db
      .from('task_review_reviewers')
      .where('workflow_id', result.workflowId)
      .orderBy('priority_rank', 'asc')) as TaskReviewReviewerFixtureRow[]
    const firstReviewer = requireFixtureRow(reviewers[0], 'first reviewer row')
    const secondReviewer = requireFixtureRow(reviewers[1], 'second reviewer row')

    assert.lengthOf(reviewers, 2)
    assert.equal(firstReviewer.reviewer_id, scenario.owner.id)
    assert.equal(firstReviewer.reviewer_role, 'task_giver_required')
    assert.equal(secondReviewer.reviewer_id, scenario.projectManager.id)
    assert.equal(secondReviewer.reviewer_role, 'manager_required')
    assert.notEqual(firstReviewer.reviewer_id, scenario.otherDoneTask.assigned_to)
    assert.notEqual(secondReviewer.reviewer_id, scenario.otherDoneTask.assigned_to)
  })

  test('opens and completes task review when only one reviewer is eligible', async ({ assert }) => {
    const scenario = await buildSingleReviewerTaskReviewScenario()

    const result = await makeEnsureTaskReviewWorkflowCommand({
      userId: scenario.owner.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: scenario.org.id,
    }).execute({
      taskId: scenario.task.id,
    })

    assert.equal(result.status, 'awaiting_review')
    assert.equal(result.requiredReviewCount, 1)

    const reviewers = (await db
      .from('task_review_reviewers')
      .where('workflow_id', result.workflowId)
      .orderBy('priority_rank', 'asc')) as TaskReviewReviewerFixtureRow[]
    const onlyReviewer = requireFixtureRow(reviewers[0], 'single reviewer row')

    assert.lengthOf(reviewers, 1)
    assert.equal(onlyReviewer.reviewer_id, scenario.owner.id)
    assert.equal(onlyReviewer.reviewer_role, 'task_giver_required')

    await makeSubmitTaskReviewCommand({
      userId: scenario.owner.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: scenario.org.id,
    }).execute({
      workflowId: result.workflowId,
      body: 'Task giver review is sufficient for this small project.',
    })

    let workflow = (await db
      .from('task_review_workflows')
      .where('id', result.workflowId)
      .firstOrFail()) as TaskReviewWorkflowFixtureRow
    assert.equal(workflow.status, 'awaiting_response')
    assert.equal(Number(workflow.completed_review_count), 1)

    await new AcceptTaskReviewCommand(
      {
        userId: scenario.reviewee.id,
        ip: '0.0.0.0',
        userAgent: 'test',
        organizationId: scenario.org.id,
      },
      confirmationDisputes
    ).execute({
      workflowId: result.workflowId,
    })

    workflow = (await db
      .from('task_review_workflows')
      .where('id', result.workflowId)
      .firstOrFail()) as TaskReviewWorkflowFixtureRow
    assert.equal(workflow.status, 'done')
    assert.isNotNull(workflow.accepted_by_reviewee_at)
    assert.isNotNull(workflow.completed_at)
  })

  test('submit allows task giver reviewer and rejects task assignee even if reviewer rows are bad data', async ({
    assert,
  }) => {
    const scenario = await buildDoneTaskBoardScenario()
    const workflow = await makeEnsureTaskReviewWorkflowCommand({
      userId: scenario.viewer.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      taskId: scenario.otherDoneTask.id,
    })

    await db.table('task_review_reviewers').insert([
      {
        workflow_id: workflow.workflowId,
        reviewer_id: scenario.otherDoneTask.assigned_to,
        reviewer_role: 'bad_assignee_reviewer',
        is_required: true,
        status: 'pending',
        priority_rank: 91,
      },
    ])

    await makeSubmitTaskReviewCommand({
      userId: scenario.owner.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      workflowId: workflow.workflowId,
      body: 'Task giver review: accepted with ownership context',
    })

    await assert.rejects(
      () =>
        makeSubmitTaskReviewCommand({
          userId: scenario.otherDoneTask.assigned_to,
          ip: '0.0.0.0',
          userAgent: 'test',
          organizationId: null,
        }).execute({
          workflowId: workflow.workflowId,
          body: 'Assignee should not review own assigned task',
        }),
      BusinessLogicException,
      'Bạn không thể review task được giao cho chính mình'
    )
  })

  test('board cards include persisted workflow id and reviewer progress', async ({ assert }) => {
    const scenario = await buildDoneTaskBoardScenario()
    const workflow = await makeEnsureTaskReviewWorkflowCommand({
      userId: scenario.viewer.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      taskId: scenario.otherDoneTask.id,
    })

    await db
      .from('task_review_reviewers')
      .where('workflow_id', workflow.workflowId)
      .where('reviewer_id', scenario.projectManager.id)
      .update({ status: 'submitted' })
    await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .update({ status: 'in_review', completed_review_count: 1 })

    const board = await new GetTaskReviewBoardQuery(
      {
        userId: scenario.projectManager.id,
        ip: '0.0.0.0',
        userAgent: 'test',
        organizationId: null,
      },
      taskBoardReader
    ).execute({
      projectId: scenario.project.id,
    })

    const inReview = board.columns.find((column) => column.status === 'in_review')
    const card = inReview?.cards.find((item) => item.taskId === scenario.otherDoneTask.id)

    assert.exists(card)
    assert.equal(card?.workflowId, workflow.workflowId)
    assert.equal(card?.reviewCount, 1)
    assert.equal(card?.requiredReviewCount, 2)
  })

  test('review quorum moves workflow to awaiting response and reviewee acceptance completes it', async ({
    assert,
  }) => {
    const scenario = await buildDoneTaskBoardScenario()
    const workflow = await makeEnsureTaskReviewWorkflowCommand({
      userId: scenario.viewer.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      taskId: scenario.otherDoneTask.id,
    })

    await makeSubmitTaskReviewCommand({
      userId: scenario.owner.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      workflowId: workflow.workflowId,
      body: 'Task giver review: accepted with notes',
    })

    let row = (await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .firstOrFail()) as TaskReviewWorkflowFixtureRow
    assert.equal(row.status, 'in_review')
    assert.equal(Number(row.completed_review_count), 1)

    await makeSubmitTaskReviewCommand({
      userId: scenario.projectManager.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      workflowId: workflow.workflowId,
      body: 'Peer review: accepted',
    })

    row = (await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .firstOrFail()) as TaskReviewWorkflowFixtureRow
    assert.equal(row.status, 'awaiting_response')
    assert.equal(Number(row.completed_review_count), 2)

    await new AcceptTaskReviewCommand(
      {
        userId: scenario.otherDoneTask.assigned_to,
        ip: '0.0.0.0',
        userAgent: 'test',
        organizationId: null,
      },
      confirmationDisputes
    ).execute({
      workflowId: workflow.workflowId,
    })

    row = (await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .firstOrFail()) as TaskReviewWorkflowFixtureRow
    assert.equal(row.status, 'done')
    assert.isNotNull(row.accepted_by_reviewee_at)
    assert.isNotNull(row.completed_at)
  })

  test('reviewee acceptance stages review-confirmed scoring event for completed legacy session', async ({
    assert,
  }) => {
    const scenario = await buildDoneTaskBoardScenario()
    const assignment = (await db
      .from('task_assignments')
      .where('task_id', scenario.otherDoneTask.id)
      .where('assignee_id', scenario.otherAssignee.id)
      .firstOrFail()) as { id: string }
    const session = await ReviewSessionFactory.create({
      task_assignment_id: assignment.id,
      reviewee_id: scenario.otherAssignee.id,
      status: 'completed',
      manager_review_completed: true,
      creator_reviewer_id: scenario.owner.id,
      creator_review_completed: true,
      manager_reviews_count: 1,
      peer_reviews_count: 1,
      required_peer_reviews: 1,
      required_total_reviews: 2,
      minimum_manager_reviews: 1,
      minimum_peer_reviews: 1,
    })
    const skill = await SkillFactory.create({ skill_name: 'Task review scoring skill' })
    const [skillReview] = (await db
      .table('skill_reviews')
      .insert({
        review_session_id: session.id,
        reviewer_id: scenario.owner.id,
        reviewer_type: 'manager',
        skill_id: skill.id,
        assigned_public_proficiency_code: 'l7',
        review_status: 'submitted',
        is_fraud: false,
      })
      .returning('id')) as Array<{ id: string }>
    const [evidence] = (await db
      .table('review_evidences')
      .insert({
        review_session_id: session.id,
        evidence_type: 'pull_request',
        url: 'https://example.test/task-review-scoring',
        title: 'Task review scoring evidence',
        uploaded_by: scenario.owner.id,
        verification_status: 'pending',
        is_sensitive: false,
      })
      .returning('id')) as Array<{ id: string }>
    if (!skillReview || !evidence) {
      throw new Error('Expected review scoring fixtures')
    }
    await db.table('skill_review_evidence_links').insert({
      skill_review_id: skillReview.id,
      review_evidence_id: evidence.id,
      relevance_type: 'direct_observation',
      reviewer_note: 'Accepted workflow should publish this evidence',
    })

    const workflow = await makeEnsureTaskReviewWorkflowCommand({
      userId: scenario.viewer.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      taskId: scenario.otherDoneTask.id,
    })
    await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .update({ status: 'awaiting_response', completed_review_count: workflow.requiredReviewCount })

    await new AcceptTaskReviewCommand(
      {
        userId: scenario.otherAssignee.id,
        ip: '0.0.0.0',
        userAgent: 'test',
        organizationId: null,
      },
      confirmationDisputes
    ).execute({
      workflowId: workflow.workflowId,
    })

    const outbox = (await db
      .from('domain_event_outbox')
      .where('event_name', 'review:confirmed')
      .where('aggregate_id', session.id)
      .firstOrFail()) as {
      payload: {
        confirmationId: string
        reviewSessionId: string
        revieweeId: string
        reviewerIds: string[]
        confirmedBy: string
        action: string
      }
    }
    const updatedSession = (await db
      .from('review_sessions')
      .where('id', session.id)
      .select('confirmations')
      .firstOrFail()) as { confirmations: ReviewConfirmationEntry[] | string | null }
    const evidenceRow = (await db
      .from('review_evidences')
      .where('id', evidence.id)
      .select('verification_status')
      .firstOrFail()) as { verification_status: string | null }
    const confirmations =
      typeof updatedSession.confirmations === 'string'
        ? (JSON.parse(updatedSession.confirmations) as ReviewConfirmationEntry[])
        : (updatedSession.confirmations ?? [])

    assert.equal(outbox.payload.reviewSessionId, session.id)
    assert.equal(outbox.payload.revieweeId, scenario.otherAssignee.id)
    assert.deepEqual(outbox.payload.reviewerIds, [scenario.owner.id])
    assert.equal(outbox.payload.confirmedBy, scenario.otherAssignee.id)
    assert.equal(outbox.payload.action, 'confirmed')
    assert.isTrue(
      confirmations.some(
        (confirmation) =>
          confirmation.user_id === scenario.otherAssignee.id && confirmation.action === 'confirmed'
      )
    )
    assert.equal(evidenceRow.verification_status, 'verified')
  })

  test('reviewee response marks dispute and report packages workflow for admin', async ({
    assert,
  }) => {
    const scenario = await buildDoneTaskBoardScenario()
    const peerTask = await TaskFactory.create({
      organization_id: scenario.org.id,
      project_id: scenario.project.id,
      project_sprint_id: scenario.sprintId,
      creator_id: scenario.owner.id,
      assigned_to: scenario.otherDoneTask.assigned_to,
      status: TaskStatus.DONE,
      title: 'Related peer task for task review dispute',
    })
    const assignment = (await db
      .from('task_assignments')
      .where('task_id', scenario.otherDoneTask.id)
      .firstOrFail()) as { id: string }
    await insertProfileAndHistory({
      userId: scenario.owner.id,
      taskId: scenario.otherDoneTask.id,
      assignmentId: assignment.id,
      organizationId: scenario.org.id,
      projectId: scenario.project.id,
      role: 'task_giver',
    })
    await insertProfileAndHistory({
      userId: scenario.otherAssignee.id,
      taskId: scenario.otherDoneTask.id,
      assignmentId: assignment.id,
      organizationId: scenario.org.id,
      projectId: scenario.project.id,
      role: 'reviewee',
    })
    const workflow = await makeEnsureTaskReviewWorkflowCommand({
      userId: scenario.viewer.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      taskId: scenario.otherDoneTask.id,
    })

    await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .update({ status: 'awaiting_response', completed_review_count: 2 })

    await makeRespondToTaskReviewCommand({
      userId: scenario.otherDoneTask.assigned_to,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      workflowId: workflow.workflowId,
      body: 'I disagree with this review because evidence is missing.',
    })

    let row = (await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .firstOrFail()) as TaskReviewWorkflowFixtureRow
    assert.equal(row.status, 'disputed')

    const superadmin = await UserFactory.createSuperadmin()

    await makeReportTaskReviewDisputeCommand({
      userId: scenario.projectManager.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      workflowId: workflow.workflowId,
      reason: 'Cannot resolve dispute in thread',
    })

    row = (await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .firstOrFail()) as TaskReviewWorkflowFixtureRow
    assert.equal(row.status, 'reported')
    assert.equal(row.reported_by, scenario.projectManager.id)
    assert.isNotNull(row.reported_at)
    const runtimeContext = parseJsonValue(row.runtime_context)
    assert.equal(runtimeContext['schema_version'], 'suar_task_review_workflow_runtime_context_v1')
    assert.equal(runtimeContext['source_type'], 'task_review_workflow')
    assert.equal(runtimeContext['dispute_review_type'], 'task_review')
    assert.equal(parseJsonValue(runtimeContext['organization'])['id'], scenario.org.id)
    assert.equal(parseJsonValue(runtimeContext['project'])['id'], scenario.project.id)
    assert.equal(parseJsonValue(runtimeContext['sprint'])['id'], scenario.sprintId)
    assert.equal(parseJsonValue(runtimeContext['task'])['id'], scenario.otherDoneTask.id)

    const taskGiverContext = parseJsonValue(runtimeContext['task_giver_context'])
    const revieweeContext = parseJsonValue(runtimeContext['reviewee_context'])
    const reporterContext = parseJsonValue(runtimeContext['reporter_context'])
    assert.equal(taskGiverContext['user_id'], scenario.owner.id)
    assert.equal(
      parseJsonValue(parseJsonValue(taskGiverContext['profile'])['summary'])['role'],
      'task_giver'
    )
    assert.include(
      recordArray(taskGiverContext['task_history']).map((item) => item['task_id']),
      scenario.otherDoneTask.id
    )
    assert.equal(revieweeContext['user_id'], scenario.otherAssignee.id)
    assert.equal(
      parseJsonValue(parseJsonValue(revieweeContext['profile'])['summary'])['role'],
      'reviewee'
    )
    assert.include(
      recordArray(revieweeContext['work_schedule']).map((item) => item['id']),
      scenario.otherDoneTask.id
    )
    assert.equal(reporterContext['user_id'], scenario.projectManager.id)
    assert.include(
      recordArray(runtimeContext['related_project_tasks']).map((item) => item['id']),
      peerTask.id
    )
    assert.include(
      recordArray(runtimeContext['sprint_peer_tasks']).map((item) => item['id']),
      scenario.otherDoneTask.id
    )

    const reportMessage = (await db
      .from('task_review_messages')
      .where('workflow_id', workflow.workflowId)
      .where('message_type', 'system')
      .firstOrFail()) as TaskReviewMessageFixtureRow
    assert.include(reportMessage.body, 'Cannot resolve dispute')
    const metadata = parseJsonValue(reportMessage.metadata)
    assert.equal(
      parseJsonValue(metadata['runtime_context'])['schema_version'],
      'suar_task_review_workflow_runtime_context_v1'
    )

    const aiResult = (await db
      .from('ai_dispute_evaluations')
      .where('source_type', 'task_review_workflow')
      .where('source_id', workflow.workflowId)
      .firstOrFail()) as Record<string, unknown>
    const requestPayload = parseJsonValue(aiResult['request_payload'])

    assert.equal(aiResult['provider'], 'clawagent')
    assert.equal(aiResult['status'], 'queued')
    assert.equal(aiResult['source_type'], 'task_review_workflow')
    assert.isNull(aiResult['case_file_id'])
    assert.equal(requestPayload['dispute_review_type'], 'task_review')
    assert.equal((requestPayload['organization'] as Record<string, unknown>)['id'], scenario.org.id)
    assert.include(
      recordArray(requestPayload['sprint_peer_tasks']).map((item) => item['id']),
      scenario.otherDoneTask.id
    )

    const previousSecret = process.env['AI_CALLBACK_SECRET']
    const callbackSecret = 'task-review-report-ai-callback-secret'
    const timestamp = Math.floor(Date.now() / 1000)
    process.env['AI_CALLBACK_SECRET'] = callbackSecret
    try {
      await new ProcessAiDisputeCallbackCommand(reviewCryptography, aiDisputeUnitOfWork).execute({
        evaluation_id: aiResult['id'] as string,
        source_id: workflow.workflowId,
        status: 'completed',
        recommendation: 'request_re_review',
        confidence_score: 0.82,
        summary: 'AI recommends another task review before admin resolution.',
        response_payload: {
          verdict: {
            recommendation: 'request_re_review',
            action_items: ['Admin should approve a re-review.'],
          },
        },
        timestamp,
        signature: signAiCallback(timestamp, aiResult['id'] as string, 'completed', callbackSecret),
      })
    } finally {
      if (previousSecret === undefined) {
        delete process.env['AI_CALLBACK_SECRET']
      } else {
        process.env['AI_CALLBACK_SECRET'] = previousSecret
      }
    }

    const adminDetail = await new GetAdminReviewDisputeDetailQuery(
      {
        userId: superadmin.id,
        ip: '0.0.0.0',
        userAgent: 'test',
        organizationId: null,
      },
      new LucidReviewDisputeArtifactReader(),
      new LucidAiDisputeEvaluationSourceReader(),
      new LucidReviewAdminDisputeReadModel()
    ).execute({ disputeId: workflow.workflowId })
    assert.lengthOf(adminDetail.ai_evaluations, 1)
    assert.equal(adminDetail.ai_evaluations[0]?.['status'], 'completed')
    assert.equal(adminDetail.ai_evaluations[0]?.['recommendation'], 'request_re_review')
    assert.include(
      adminDetail.timeline.map((entry) => entry.kind),
      'ai_evaluation'
    )
  })

  test('report stages the canonical Clawagent arbitration contract', async ({ assert }) => {
    const scenario = await buildDoneTaskBoardScenario()
    const assignment = (await db
      .from('task_assignments')
      .where('task_id', scenario.otherDoneTask.id)
      .firstOrFail()) as { id: string }
    await insertProfileAndHistory({
      userId: scenario.owner.id,
      taskId: scenario.otherDoneTask.id,
      assignmentId: assignment.id,
      organizationId: scenario.org.id,
      projectId: scenario.project.id,
      role: 'task_giver',
    })
    await insertProfileAndHistory({
      userId: scenario.otherAssignee.id,
      taskId: scenario.otherDoneTask.id,
      assignmentId: assignment.id,
      organizationId: scenario.org.id,
      projectId: scenario.project.id,
      role: 'reviewee',
    })
    const workflow = await makeEnsureTaskReviewWorkflowCommand({
      userId: scenario.viewer.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      taskId: scenario.otherDoneTask.id,
    })
    await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .update({ status: 'awaiting_response', completed_review_count: 2 })
    await makeRespondToTaskReviewCommand({
      userId: scenario.otherDoneTask.assigned_to,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      workflowId: workflow.workflowId,
      body: 'I need AI arbitration because the review missed evidence.',
    })
    await UserFactory.createSuperadmin()

    await makeReportTaskReviewDisputeCommand({
      userId: scenario.projectManager.id,
      ip: '0.0.0.0',
      userAgent: 'test',
      organizationId: null,
    }).execute({
      workflowId: workflow.workflowId,
      reason: 'Cannot resolve task review dispute without AI arbitration',
    })

    const aiResult = (await db
      .from('ai_dispute_evaluations')
      .where('source_type', 'task_review_workflow')
      .where('source_id', workflow.workflowId)
      .firstOrFail()) as Record<string, unknown>
    const triggerPayload = parseJsonValue(aiResult['trigger_payload']) as {
      evaluation_id: string
      source_type: string
      source_id: string
      callbackUrl: string
      context: {
        source_type: string
        source_id: string
        dispute_review_type: string
        organization: { id: string }
      }
    }
    assert.equal(triggerPayload.source_type, 'task_review_workflow')
    assert.equal(triggerPayload.source_id, workflow.workflowId)
    assert.match(triggerPayload.callbackUrl, /\/api\/public\/ai-disputes\/callback$/u)
    assert.equal(triggerPayload.context.source_type, 'task_review_workflow')
    assert.equal(triggerPayload.context.source_id, workflow.workflowId)
    assert.equal(triggerPayload.context.dispute_review_type, 'task_review')
    assert.equal(triggerPayload.context.organization.id, scenario.org.id)

    const row = (await db
      .from('task_review_workflows')
      .where('id', workflow.workflowId)
      .firstOrFail()) as TaskReviewWorkflowFixtureRow

    assert.equal(aiResult['status'], 'queued')
    assert.isNull(aiResult['external_run_id'])
    assert.equal(row.status, 'reported')
  })
})
