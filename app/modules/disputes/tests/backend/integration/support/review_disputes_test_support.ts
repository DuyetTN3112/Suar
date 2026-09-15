import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import { BACKEND_NOTIFICATION_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import type { NotificationFanoutStagerContract } from '#modules/notifications/public_contracts/notification_fanout'
import type { PlatformEvent } from '#modules/observability/public_contracts/platform_observability'
import { platformOperationalLogger } from '#modules/observability/public_contracts/platform_observability'
import ReportReviewDisputeCommand from '#modules/disputes/actions/commands/report_review_dispute_command'
import LucidReviewDisputeCaseFileUnitOfWork from '#modules/disputes/infra/adapters/lucid_review_dispute_case_file_unit_of_work'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ReviewSessionFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

export async function createDisputeScenario() {
  const superadmin = await UserFactory.createSuperadmin()
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const reviewee = await UserFactory.create({ current_organization_id: org.id })
  await OrganizationUserFactory.create({
    organization_id: org.id,
    user_id: reviewee.id,
    org_role: 'org_member',
    status: 'approved',
  })
  const task = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    assigned_to: reviewee.id,
    title: 'Review dispute contract task',
  })
  const sprintId = testId()
  await db.table('project_sprints').insert({
    id: sprintId,
    organization_id: org.id,
    project_id: task.project_id,
    name: 'Review dispute sprint',
    status: 'active',
    starts_at: DateTime.now().minus({ days: 7 }).toISO(),
    ends_at: DateTime.now().plus({ days: 7 }).toISO(),
    created_by: owner.id,
  })
  await db.from('tasks').where('id', task.id).update({ project_sprint_id: sprintId })
  const assignment = await TaskAssignmentFactory.create({
    task_id: task.id,
    assignee_id: reviewee.id,
    assigned_by: owner.id,
    assignment_status: 'completed',
  })
  const reviewSession = await ReviewSessionFactory.create({
    task_assignment_id: assignment.id,
    reviewee_id: reviewee.id,
    status: 'completed',
  })
  const disputeId = testId()

  await db.table('review_disputes').insert({
    id: disputeId,
    review_session_id: reviewSession.id,
    task_assignment_id: assignment.id,
    task_id: task.id,
    reviewee_id: reviewee.id,
    opened_by: owner.id,
    status: 'pending',
    dispute_reason: 'Need a second review',
    requested_outcome: 'adjust_score',
    disputed_dimensions: JSON.stringify(['quality']),
    disputed_skill_reviews: JSON.stringify([]),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  return { superadmin, org, owner, reviewee, disputeId, task, assignment, reviewSession, sprintId }
}

export async function createUserProfileAndHistory(input: {
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
    scoring_version: 'test_profile_v1',
  })
  await db.table('user_work_history').insert({
    id: testId(),
    user_id: input.userId,
    task_id: input.taskId,
    task_assignment_id: input.assignmentId,
    organization_id: input.organizationId,
    project_id: input.projectId,
    task_title: `${input.role} work history`,
    task_type: 'review_dispute_context',
    business_domain: 'trust_review',
    problem_category: 'review_dispute',
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
    completed_at: new Date(),
  })
}

export function parseSnapshot(value: unknown): Record<string, unknown> {
  return typeof value === 'string'
    ? (JSON.parse(value) as Record<string, unknown>)
    : ((value ?? {}) as Record<string, unknown>)
}

export function recordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? (value as Array<Record<string, unknown>>) : []
}

export function configureReviewDisputesTestGroup(group: {
  setup: (fn: () => Promise<void>) => void
  teardown: (fn: () => Promise<void>) => void
  each: { teardown: (fn: () => Promise<void>) => void }
}) {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())
}

export {
  BACKEND_NOTIFICATION_TYPES,
  cleanupTestData,
  DateTime,
  db,
  LucidReviewDisputeCaseFileUnitOfWork,
  NotificationFanoutStagerContract,
  OrganizationFactory,
  OrganizationUserFactory,
  PlatformEvent,
  platformOperationalLogger,
  ReportReviewDisputeCommand,
  ReviewSessionFactory,
  setupApp,
  TaskAssignmentFactory,
  TaskFactory,
  teardownApp,
  testId,
  UserFactory,
}
