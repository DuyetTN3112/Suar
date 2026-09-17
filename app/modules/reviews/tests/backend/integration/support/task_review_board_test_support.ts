import crypto from 'node:crypto'

import db from '@adonisjs/lucid/services/db'

import BusinessLogicException from '#modules/errors/public_contracts/business_logic_exception'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import ProcessAiDisputeCallbackCommand from '#modules/disputes/actions/commands/process_ai_dispute_callback_command'
import AcceptTaskReviewCommand from '#modules/reviews/actions/commands/task-review/accept_task_review_command'
import EnsureTaskReviewWorkflowCommand from '#modules/reviews/actions/commands/task-review/ensure_task_review_workflow_command'
import OpenTaskReviewDisputeCommand from '#modules/reviews/actions/commands/task-review/open_task_review_dispute_command'
import ReportTaskReviewDisputeCommand from '#modules/reviews/actions/commands/task-review/report_task_review_dispute_command'
import RespondToTaskReviewCommand from '#modules/reviews/actions/commands/task-review/respond_to_task_review_command'
import SubmitTaskReviewCommand from '#modules/reviews/actions/commands/task-review/submit_task_review_command'
import GetAdminReviewDisputeDetailQuery from '#modules/disputes/actions/queries/get_admin_review_dispute_detail_query'
import GetTaskReviewBoardQuery from '#modules/reviews/actions/queries/task-review/get_task_review_board_query'
import type { ReviewActionContext } from '#modules/reviews/actions/review_action_context'
import LucidAiDisputeEvaluationSourceReader from '#modules/disputes/infra/adapters/lucid_ai_dispute_evaluation_source_reader'
import LucidAiDisputeUnitOfWork from '#modules/disputes/infra/adapters/lucid_ai_dispute_unit_of_work'
import LucidReviewAdminDisputeReadModel from '#modules/disputes/infra/adapters/lucid_review_admin_dispute_read_model'
import LucidReviewConfirmationDisputeUnitOfWork from '#modules/disputes/infra/adapters/lucid_review_confirmation_dispute_unit_of_work'
import LucidReviewDisputeArtifactReader from '#modules/disputes/infra/adapters/lucid_review_dispute_artifact_reader'
import { NodeReviewCryptography } from '#modules/reviews/infra/adapters/review-core/node_review_cryptography'
import { LucidReviewTaskBoardReader } from '#modules/reviews/infra/adapters/task-review/lucid_review_task_board_reader'
import LucidReviewTaskWorkflowUnitOfWork from '#modules/reviews/infra/adapters/task-review/lucid_review_task_workflow_unit_of_work'
import { getTaskReviewDetailByTask } from '#modules/reviews/infra/repositories/read/task_review_board_queries'
import type { ReviewConfirmationEntry } from '#modules/reviews/types/review_confirmation_entry'
import { listAssignmentDeliverySourceRows } from '#modules/tasks/infra/repositories/task-assignment/read/assignment_delivery_fact_queries'
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

export {
  AcceptTaskReviewCommand,
  BusinessLogicException,
  cleanupTestData,
  crypto,
  db,
  EnsureTaskReviewWorkflowCommand,
  ForbiddenException,
  GetAdminReviewDisputeDetailQuery,
  getTaskReviewDetailByTask,
  GetTaskReviewBoardQuery,
  listAssignmentDeliverySourceRows,
  LucidAiDisputeEvaluationSourceReader,
  LucidAiDisputeUnitOfWork,
  LucidReviewAdminDisputeReadModel,
  LucidReviewConfirmationDisputeUnitOfWork,
  LucidReviewDisputeArtifactReader,
  LucidReviewTaskBoardReader,
  LucidReviewTaskWorkflowUnitOfWork,
  NodeReviewCryptography,
  OpenTaskReviewDisputeCommand,
  OrganizationFactory,
  OrganizationUserFactory,
  ProcessAiDisputeCallbackCommand,
  ProjectFactory,
  ProjectMemberFactory,
  ReportTaskReviewDisputeCommand,
  RespondToTaskReviewCommand,
  ReviewConfirmationEntry,
  ReviewSessionFactory,
  setupApp,
  SkillFactory,
  SubmitTaskReviewCommand,
  TaskAssignmentFactory,
  TaskFactory,
  TaskStatus,
  teardownApp,
  testId,
  UserFactory,
}

export const taskBoardReader = new LucidReviewTaskBoardReader()
export const reviewCryptography = new NodeReviewCryptography()
export const aiDisputeUnitOfWork = new LucidAiDisputeUnitOfWork()
export const confirmationDisputes = new LucidReviewConfirmationDisputeUnitOfWork()
export const taskWorkflowUnitOfWork = new LucidReviewTaskWorkflowUnitOfWork()

export const makeEnsureTaskReviewWorkflowCommand = (execCtx: ReviewActionContext) =>
  new EnsureTaskReviewWorkflowCommand(execCtx, taskWorkflowUnitOfWork)
export const makeReportTaskReviewDisputeCommand = (execCtx: ReviewActionContext) =>
  new ReportTaskReviewDisputeCommand(execCtx, taskWorkflowUnitOfWork)
export const makeOpenTaskReviewDisputeCommand = (execCtx: ReviewActionContext) =>
  new OpenTaskReviewDisputeCommand(execCtx, taskWorkflowUnitOfWork)
export const makeRespondToTaskReviewCommand = (execCtx: ReviewActionContext) =>
  new RespondToTaskReviewCommand(execCtx, taskWorkflowUnitOfWork)
export const makeSubmitTaskReviewCommand = (execCtx: ReviewActionContext) =>
  new SubmitTaskReviewCommand(execCtx, taskWorkflowUnitOfWork)

export interface TaskReviewWorkflowFixtureRow {
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

export interface TaskReviewReviewerFixtureRow {
  reviewer_id: string
  reviewer_role: string
}

export interface TaskReviewMessageFixtureRow {
  body: string
  metadata?: unknown
}

export function parseJsonValue(value: unknown): Record<string, unknown> {
  return typeof value === 'string'
    ? (JSON.parse(value) as Record<string, unknown>)
    : ((value ?? {}) as Record<string, unknown>)
}

export function recordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : []
}

export function signAiCallback(
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

export async function insertProfileAndHistory(input: {
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

export function requireFixtureRow<T>(value: T | undefined, label: string): T {
  if (!value) {
    throw new Error(`Missing ${label}`)
  }
  return value
}

export async function completedAssignmentId(taskId: string): Promise<string> {
  const assignment = (await db
    .from('task_assignments')
    .where('task_id', taskId)
    .where('assignment_status', 'completed')
    .orderBy('completed_at', 'desc')
    .select('id')
    .firstOrFail()) as { id: string }
  return assignment.id
}

export async function buildDoneTaskBoardScenario() {
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

export async function buildSingleReviewerTaskReviewScenario() {
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

export function configureTaskReviewBoardTestGroup(group: {
  setup: (fn: () => Promise<void>) => void
  teardown: (fn: () => Promise<void>) => void
}) {
  group.setup(async () => {
    await setupApp()
    await cleanupTestData()
  })
  group.teardown(async () => {
    await cleanupTestData()
    await teardownApp()
  })
}
