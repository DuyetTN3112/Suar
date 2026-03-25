import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import CreateReviewDisputeCommand from '#modules/reviews/actions/commands/create_review_dispute_command'
import ResolveReviewDisputeCommand from '#modules/reviews/actions/commands/resolve_review_dispute_command'
import RespondToReviewDisputeCommand from '#modules/reviews/actions/commands/respond_to_review_dispute_command'
import StartAiDisputeEvaluationCommand from '#modules/reviews/actions/commands/start_ai_dispute_evaluation_command'
import { makeSystemReviewActionContext } from '#modules/reviews/actions/review_action_context'
import {
  PROFILE_UPDATE_ACTION,
  REVIEWER_CREDIBILITY_ACTION,
} from '#modules/reviews/constants/review_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  ProjectFactory,
  ReviewSessionFactory,
  SkillReviewFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'

async function countAuditEvents(
  action: string,
  entityType: string,
  entityId: string
): Promise<number> {
  const result = (await db
    .from('audit_events')
    .where('action', action)
    .where('entity_type', entityType)
    .where('entity_id', entityId)
    .count('* as count')) as { count: number | string }[]

  return Number(result[0]?.count ?? 0)
}

async function buildDisputeScenario() {
  const superadmin = await UserFactory.create({ system_role: 'system_admin' })
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const reviewee = await UserFactory.create({ current_organization_id: org.id })
  const reviewer = await UserFactory.create()

  await OrganizationUserFactory.create({
    organization_id: org.id,
    user_id: reviewee.id,
    org_role: 'org_member',
    status: 'approved',
  })

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
    name: 'Review dispute observability sprint',
    goal: 'Provide same-project and same-sprint context for dispute arbitration.',
    status: 'active',
    starts_at: DateTime.utc().minus({ days: 7 }).toSQL(),
    ends_at: DateTime.utc().plus({ days: 7 }).toSQL(),
    created_by: owner.id,
    closed_by: null,
    review_opened_at: null,
    review_closed_at: null,
  })

  const task = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    project_id: project.id,
    project_sprint_id: sprintId,
    assigned_to: reviewee.id,
  })
  const relatedTask = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    project_id: project.id,
    project_sprint_id: sprintId,
    assigned_to: reviewee.id,
    title: 'Related observability sprint task',
    status: 'done',
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
    status: 'completed',
    completed_at: DateTime.now(),
  })

  await SkillReviewFactory.create({
    review_session_id: session.id,
    reviewer_id: reviewer.id,
  })

  return {
    superadmin,
    org,
    owner,
    reviewee,
    reviewer,
    project,
    sprintId,
    task,
    relatedTask,
    assignment,
    session,
  }
}

test.group('Integration | Review Dispute Observability', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('create dispute persists structured workflow audit evidence', async ({ assert }) => {
    const scenario = await buildDisputeScenario()
    const command = new CreateReviewDisputeCommand(
      makeSystemReviewActionContext(scenario.reviewee.id)
    )

    const dispute = await command.execute({
      review_session_id: scenario.session.id,
      dispute_reason: 'Need second review',
      disputed_dimensions: { code_quality: true },
      disputed_skill_reviews: [],
      requested_outcome: 'adjust_score',
    })

    assert.equal(await countAuditEvents('review.dispute.created', 'review_dispute', dispute.id), 1)
  })

  test('respond, resolve, and queue ai evaluation persist structured workflow audit evidence', async ({
    assert,
  }) => {
    const scenario = await buildDisputeScenario()
    const createCommand = new CreateReviewDisputeCommand(
      makeSystemReviewActionContext(scenario.reviewee.id)
    )
    const dispute = await createCommand.execute({
      review_session_id: scenario.session.id,
      dispute_reason: 'Need evidence review',
      disputed_dimensions: { communication: true },
      disputed_skill_reviews: [],
      requested_outcome: 'adjust_score',
    })

    const respondCommand = new RespondToReviewDisputeCommand(
      makeSystemReviewActionContext(scenario.reviewer.id)
    )
    const response = await respondCommand.execute({
      dispute_id: dispute.id,
      body: 'Reviewer context attached',
      visibility: 'all_parties',
    })

    await db.table('review_dispute_case_files').insert({
      id: testId(),
      dispute_id: dispute.id,
      case_version: 1,
      created_by: scenario.superadmin.id,
      task_snapshot: JSON.stringify({
        id: scenario.task.id,
        task_id: scenario.task.id,
        organization_id: scenario.org.id,
        project_id: scenario.project.id,
        project_sprint_id: scenario.sprintId,
        organization: {
          id: scenario.org.id,
          name: scenario.org.name,
        },
        project: {
          id: scenario.project.id,
          name: scenario.project.name,
          sprint_id: scenario.sprintId,
        },
        related_project_tasks: [
          {
            id: scenario.relatedTask.id,
            title: scenario.relatedTask.title,
            project_id: scenario.project.id,
          },
        ],
        sprint_peer_tasks: [
          {
            id: scenario.relatedTask.id,
            title: scenario.relatedTask.title,
            project_sprint_id: scenario.sprintId,
          },
        ],
      }),
      required_skills_snapshot: JSON.stringify([]),
      acceptance_criteria_snapshot: JSON.stringify({}),
      assignment_snapshot: JSON.stringify({ assignment_id: scenario.assignment.id }),
      submission_snapshot: JSON.stringify({ submission_id: 'submission-1' }),
      review_snapshot: JSON.stringify({ overall_feedback: 'original review feedback' }),
      skill_reviews_snapshot: JSON.stringify([{ id: 'skill-review-1' }]),
      evidences_snapshot: JSON.stringify([{ id: 'evidence-1' }]),
      self_assessment_snapshot: JSON.stringify({}),
      task_comments_snapshot: JSON.stringify([]),
      task_history_snapshot: JSON.stringify([]),
      reviewee_profile_context_snapshot: JSON.stringify({
        reviewee_id: scenario.reviewee.id,
        user_id: scenario.reviewee.id,
        profile: { summary: { role: 'reviewee' } },
        work_schedule: [{ id: scenario.task.id, title: scenario.task.title }],
        task_history: [],
      }),
      reviewer_context_snapshot: JSON.stringify({
        reviewer_id: scenario.reviewer.id,
        user_id: scenario.reviewer.id,
        profile: { summary: { role: 'reviewer' } },
        work_schedule: [{ id: scenario.relatedTask.id, title: scenario.relatedTask.title }],
        task_history: [],
      }),
      dispute_claim_snapshot: JSON.stringify({
        requested_outcome: 'adjust_score',
        dispute_comments: [
          { author_context: 'reviewee', body: 'Reviewee dispute message' },
          { author_context: 'reviewer', body: 'Reviewer response message' },
        ],
      }),
      completeness_score: 100,
      missing_data: JSON.stringify([]),
      created_at: DateTime.now().toISO(),
    })

    const resolveCommand = new ResolveReviewDisputeCommand(
      makeSystemReviewActionContext(scenario.superadmin.id)
    )
    process.env['NODE_ENV'] = 'testing'
    const aiCommand = new StartAiDisputeEvaluationCommand(
      makeSystemReviewActionContext(scenario.superadmin.id)
    )
    const evaluation = await aiCommand.execute({
      dispute_id: dispute.id,
      provider: 'ai_council',
    })
    const resolved = await resolveCommand.execute({
      dispute_id: dispute.id,
      final_decision: 'adjust_score',
      final_rationale: 'Evidence supports adjustment',
      profile_update_action: PROFILE_UPDATE_ACTION.RECALCULATE,
      reviewer_credibility_action: REVIEWER_CREDIBILITY_ACTION.MARK_DISPUTED,
    })

    assert.equal(response.dispute_id, dispute.id)
    assert.equal(resolved.id, dispute.id)
    assert.equal(evaluation.dispute_id, dispute.id)
    assert.deepEqual(evaluation.request_payload.acceptance_criteria, {})
    assert.deepEqual(evaluation.request_payload.self_assessment, {})
    assert.deepEqual(evaluation.request_payload.task_history, [])
    assert.equal(evaluation.request_payload.completeness_score, 100)
    assert.deepEqual(evaluation.request_payload.missing_data, [])
    assert.equal(
      await countAuditEvents('review.dispute.response_created', 'review_dispute', dispute.id),
      1
    )
    assert.equal(await countAuditEvents('review.dispute.resolved', 'review_dispute', dispute.id), 1)
    assert.equal(
      await countAuditEvents(
        'review.dispute.ai_evaluation.completed',
        'review_dispute',
        dispute.id
      ),
      1
    )
  })
})
