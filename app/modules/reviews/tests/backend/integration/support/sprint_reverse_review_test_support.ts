import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import { makeGetOrganizationShowPageQuery } from '#composition/organizations/dashboard/organization_portfolio_composition'
import { makeStartAiDisputeEvaluationCommand } from '#composition/reviews/review-core/review_action_factory'
import ForbiddenException from '#modules/errors/public_contracts/forbidden_exception'
import RespondSprintReverseReviewWorkflowCommand from '#modules/disputes/actions/commands/respond_sprint_reverse_review_workflow_command'
import AcceptSprintReverseReviewWorkflowCommand from '#modules/reviews/actions/commands/sprint-review/accept_sprint_reverse_review_workflow_command'
import CloseProjectSprintReviewCommand from '#modules/reviews/actions/commands/sprint-review/close_project_sprint_review_command'
import ReportSprintReverseReviewWorkflowCommand from '#modules/reviews/actions/commands/sprint-review/report_sprint_reverse_review_workflow_command'
import SubmitSprintReverseReviewWorkflowCommand from '#modules/reviews/actions/commands/sprint-review/submit_sprint_reverse_review_workflow_command'
import GetSprintReverseReviewBoardQuery from '#modules/reviews/actions/queries/sprint-review/get_sprint_reverse_review_board_query'
import { NodeReviewCryptography } from '#modules/reviews/infra/adapters/review-core/node_review_cryptography'
import LucidReviewSprintPackageMutationUnitOfWork from '#modules/reviews/infra/adapters/sprint-review/lucid_review_sprint_package_mutation_unit_of_work'
import LucidReviewSprintReverseBoardReader from '#modules/reviews/infra/adapters/sprint-review/lucid_review_sprint_reverse_board_reader'
import LucidReviewSprintReverseWorkflowUnitOfWork from '#modules/reviews/infra/adapters/sprint-review/lucid_review_sprint_reverse_workflow_unit_of_work'
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

export function makeContext(userId: string, organizationId: string) {
  return {
    userId,
    organizationId,
    ip: '127.0.0.1',
    userAgent: 'test',
  }
}

export const reviewCryptography = new NodeReviewCryptography()
export const sprintPackageMutationUnitOfWork = new LucidReviewSprintPackageMutationUnitOfWork()
export const sprintReverseWorkflowUnitOfWork = new LucidReviewSprintReverseWorkflowUnitOfWork()

export function requireTestValue<T>(value: T | null | undefined, label: string): T {
  if (value === null || value === undefined) {
    throw new Error(`Missing ${label}`)
  }
  return value
}

export function parseMetadata(value: unknown): Record<string, unknown> {
  return typeof value === 'string'
    ? (JSON.parse(value) as Record<string, unknown>)
    : ((value ?? {}) as Record<string, unknown>)
}

export function recordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : []
}

export async function insertWorkHistory(input: {
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

export interface SprintReviewPackageRow {
  reviewer_id: string
}

export interface SprintReverseWorkflowRow {
  reviewer_id: string
  target_type: string
  target_user_id: string | null
  target_entity_id: string | null
  responder_id: string | null
}

export interface SprintReverseWorkflowStateRow {
  status: string
  target_type: string
  rating: number | null
  accepted_at: unknown
  reported_at: unknown
}

export interface SprintReverseMessageRow {
  message_type: string
  metadata: unknown
}

export function configureSprintReverseReviewTestGroup(group: {
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

export {
  AcceptSprintReverseReviewWorkflowCommand,
  cleanupTestData,
  CloseProjectSprintReviewCommand,
  DateTime,
  db,
  ForbiddenException,
  GetSprintReverseReviewBoardQuery,
  LucidReviewSprintReverseBoardReader,
  makeGetOrganizationShowPageQuery,
  makeStartAiDisputeEvaluationCommand,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ProjectMemberFactory,
  ProjectSprint,
  ReportSprintReverseReviewWorkflowCommand,
  RespondSprintReverseReviewWorkflowCommand,
  setupApp,
  SubmitSprintReverseReviewWorkflowCommand,
  TaskAssignmentFactory,
  TaskFactory,
  teardownApp,
  testId,
  UserFactory,
}
