import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'

import ProjectSprint from '#modules/reviews/infra/models/sprint-review/project_sprint'
import {
  OrganizationFactory,
  ProjectFactory,
  ReviewSessionFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

export async function buildAdminDisputeScenario() {
  const superadmin = await UserFactory.createSuperadmin()
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const reviewee = await UserFactory.create({ current_organization_id: org.id })
  const task = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    assigned_to: reviewee.id,
    title: 'Collection standardization dispute task',
  })
  const assignment = await TaskAssignmentFactory.create({
    task_id: task.id,
    assignee_id: reviewee.id,
    assigned_by: owner.id,
    assignment_status: 'completed',
  })
  const session = await ReviewSessionFactory.create({
    task_assignment_id: assignment.id,
    reviewee_id: reviewee.id,
    status: 'disputed',
  })
  const disputeId = testId()

  await db.table('review_disputes').insert({
    id: disputeId,
    review_session_id: session.id,
    task_assignment_id: assignment.id,
    task_id: task.id,
    reviewee_id: reviewee.id,
    opened_by: owner.id,
    status: 'pending',
    dispute_reason: 'Need admin review',
    disputed_dimensions: JSON.stringify(['quality']),
    disputed_skill_reviews: JSON.stringify([]),
    requested_outcome: 'adjust_score',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  return { superadmin, disputeId }
}

export async function buildAdminSprintDisputeScenario() {
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
    name: 'Admin Sprint Dispute Sprint',
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
    title: 'Admin sprint context task',
    status: 'done',
  })
  const packageId = testId()
  const disputeId = testId()

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
    dispute_reason: 'Manager context missed related sprint task.',
    dispute_review_type: 'manager_review',
    requested_outcome: 'add_context',
    escalation_reason: 'Admin needs org/project/sprint context.',
    reported_to_admin_at: '2026-07-14T03:00:00.000Z',
    reported_to_admin_by: reviewer.id,
    runtime_context: JSON.stringify({
      schema_version: 'suar_sprint_review_dispute_runtime_context_v1',
      dispute_review_type: 'manager_review',
      organization: { id: org.id, name: org.name },
      project: { id: project.id, name: project.name },
      sprint: { id: sprint.id, name: sprint.name },
      sprint_peer_tasks: [{ id: task.id, project_sprint_id: sprint.id, title: task.title }],
      manager_reviews: [{ target_user_id: owner.id, rating: 2 }],
      environment_reviews: [],
    }),
    created_at: '2026-07-14T02:30:00.000Z',
    updated_at: '2026-07-14T03:00:00.000Z',
  })
  await db.table('sprint_review_dispute_comments').insert({
    id: testId(),
    dispute_id: disputeId,
    author_id: reviewer.id,
    body: 'Need related sprint context.',
    visibility: 'all_parties',
    created_at: '2026-07-14T02:45:00.000Z',
    updated_at: '2026-07-14T02:45:00.000Z',
  })

  return { superadmin, disputeId, org, project, sprint, task }
}

export async function buildAdminSprintReverseWorkflowScenario() {
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
    name: 'Admin Reverse Workflow Sprint',
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
    title: 'Environment context task',
    status: 'done',
  })
  const workflowId = testId()

  await db.table('sprint_reverse_review_workflows').insert({
    id: workflowId,
    sprint_id: sprint.id,
    project_id: project.id,
    organization_id: org.id,
    reviewer_id: reviewer.id,
    target_type: 'environment',
    target_user_id: null,
    target_entity_id: org.id,
    responder_id: owner.id,
    status: 'reported',
    rating: 2,
    comment: 'Environment lacked handoff clarity.',
    package_id: null,
    submitted_at: '2026-07-14T02:00:00.000Z',
    accepted_at: null,
    reported_at: '2026-07-14T03:00:00.000Z',
    created_at: '2026-07-14T01:30:00.000Z',
    updated_at: '2026-07-14T03:00:00.000Z',
  })
  await db.table('sprint_reverse_review_messages').insert({
    id: testId(),
    workflow_id: workflowId,
    author_id: owner.id,
    message_type: 'report',
    body: 'Escalate unresolved environment review.',
    metadata: JSON.stringify({
      runtime_context: {
        schema_version: 'suar_sprint_reverse_review_report_context_v1',
        dispute_review_type: 'environment_review',
        organization: { id: org.id, name: org.name },
        project: { id: project.id, name: project.name },
        sprint: { id: sprint.id, name: sprint.name },
        sprint_peer_tasks: [{ id: task.id, project_sprint_id: sprint.id, title: task.title }],
      },
    }),
    created_at: '2026-07-14T03:00:00.000Z',
  })

  return { superadmin, workflowId, org, project, sprint, task }
}

export async function buildAdminTaskReviewWorkflowScenario() {
  const superadmin = await UserFactory.createSuperadmin()
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const reviewee = await UserFactory.create({ current_organization_id: org.id })
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
    name: 'Admin Task Review Workflow Sprint',
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
    assigned_to: reviewee.id,
    title: 'Admin task review workflow context task',
    status: 'done',
  })
  const workflowId = testId()
  const runtimeContext = {
    schema_version: 'suar_task_review_workflow_runtime_context_v1',
    source_type: 'task_review_workflow',
    dispute_review_type: 'task_review',
    organization: { id: org.id, name: org.name },
    project: { id: project.id, name: project.name },
    sprint: { id: sprint.id, name: sprint.name },
    task: { id: task.id, title: task.title, project_sprint_id: sprint.id },
    task_giver_context: { user_id: owner.id, profile: { summary: { role: 'task_giver' } } },
    reviewee_context: { user_id: reviewee.id, profile: { summary: { role: 'reviewee' } } },
    reporter_context: { user_id: reviewer.id },
    related_project_tasks: [{ id: task.id, project_id: project.id, title: task.title }],
    sprint_peer_tasks: [{ id: task.id, project_sprint_id: sprint.id, title: task.title }],
  }

  await db.table('task_review_workflows').insert({
    id: workflowId,
    task_id: task.id,
    project_id: project.id,
    organization_id: org.id,
    reviewee_id: reviewee.id,
    status: 'reported',
    required_review_count: 2,
    completed_review_count: 2,
    accepted_by_reviewee_at: null,
    reported_at: '2026-07-14T03:00:00.000Z',
    reported_by: reviewer.id,
    runtime_context: JSON.stringify(runtimeContext),
    completed_at: null,
    created_at: '2026-07-14T01:30:00.000Z',
    updated_at: '2026-07-14T03:00:00.000Z',
  })
  await db.table('task_review_messages').insert({
    id: testId(),
    workflow_id: workflowId,
    author_id: reviewer.id,
    message_type: 'system',
    body: 'Task review dispute reported: Admin needs task workflow context.',
    metadata: JSON.stringify({ runtime_context: runtimeContext }),
    created_at: '2026-07-14T03:00:00.000Z',
  })

  await db.table('task_review_reviewers').insert({
    workflow_id: workflowId,
    reviewer_id: reviewer.id,
    reviewer_role: 'project_member_reviewer',
    is_required: false,
    status: 'submitted',
    priority_rank: 100,
  })

  return { superadmin, workflowId, org, project, sprint, task, reviewee, reviewer }
}

export async function insertAiEvaluationForSource(input: {
  sourceId: string
  sourceType: string
  recommendation: string
}) {
  await db.table('ai_dispute_evaluations').insert({
    id: testId(),
    dispute_id: input.sourceId,
    case_file_id: null,
    source_type: input.sourceType,
    source_id: input.sourceId,
    provider: 'clawagent',
    external_run_id: `${input.sourceType}-run-1`,
    status: 'completed',
    recommendation: input.recommendation,
    confidence_score: 0.82,
    summary: 'AI result ready for admin review.',
    request_payload: JSON.stringify({
      case_id: input.sourceId,
      source_type: input.sourceType,
    }),
    response_payload: JSON.stringify({
      verdict: {
        recommendation: input.recommendation,
      },
    }),
    created_at: '2026-07-14T03:05:00.000Z',
    completed_at: '2026-07-14T03:10:00.000Z',
  })
}
