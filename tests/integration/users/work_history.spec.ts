import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  ReviewSessionFactory,
  SkillFactory,
  SkillReviewFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'
import { testId } from '#tests/helpers/test_utils'
import BuildUserWorkHistoryCommand from '#actions/users/commands/build_user_work_history_command'
import { ExecutionContext } from '#types/execution_context'
import UserWorkHistory from '#models/user_work_history'
import ReviewEvidence from '#models/review_evidence'
import TaskSelfAssessment from '#models/task_self_assessment'
import { MongoAuditLogModel } from '#models/mongo/audit_log'
import db from '@adonisjs/lucid/services/db'

function buildExecutionContext(userId: string): ExecutionContext {
  return ExecutionContext.system(userId)
}

async function getLatestAuditSummary(userId: string) {
  return (await MongoAuditLogModel.find({
    action: 'build_user_work_history',
    entity_type: 'user_work_history',
    entity_id: userId,
  })
    .sort({ created_at: -1 })
    .lean()
    .exec()) as Array<{ new_values?: Record<string, unknown> | null }>
}

async function seedCompletedAssignment() {
  const { org, owner } = await OrganizationFactory.createWithOwner()
  const reviewee = await UserFactory.createFreelancer()
  const task = await TaskFactory.create({
    organization_id: org.id,
    creator_id: owner.id,
    assigned_to: reviewee.id,
    due_date: DateTime.now().plus({ days: 3 }),
    actual_time: 6,
    estimated_time: 8,
  })

  await db
    .from('tasks')
    .where('id', task.id)
    .update({
      updated_at: DateTime.now().toSQL(),
      task_type: 'feature_development',
      business_domain: 'internal_tooling',
      problem_category: 'automation',
      role_in_task: 'lead',
      autonomy_level: 'autonomous',
      collaboration_type: 'solo',
      tech_stack: JSON.stringify(['typescript', 'adonisjs']),
      domain_tags: JSON.stringify(['backend', 'platform']),
      measurable_outcomes: JSON.stringify([{ name: 'latency', target: 'lower' }]),
      impact_scope: 'team',
    })

  const assignment = await TaskAssignmentFactory.create({
    task_id: task.id,
    assignee_id: reviewee.id,
    assigned_by: owner.id,
    assignment_type: 'freelancer',
    assignment_status: 'completed',
    estimated_hours: 8,
    progress_percentage: 100,
  })
  await assignment
    .merge({
      actual_hours: 6,
      completed_at: DateTime.now().plus({ days: 1 }),
    })
    .save()

  const session = await ReviewSessionFactory.create({
    task_assignment_id: assignment.id,
    reviewee_id: reviewee.id,
    status: 'completed',
    manager_review_completed: true,
    peer_reviews_count: 1,
    required_peer_reviews: 1,
    confirmations: [],
  })
  await session
    .merge({
      overall_quality_score: 4,
      completed_at: DateTime.now().plus({ days: 1 }),
    })
    .save()

  const skill = await SkillFactory.create({ skill_name: 'TypeScript' })
  await SkillReviewFactory.create({
    review_session_id: session.id,
    reviewer_id: owner.id,
    reviewer_type: 'manager',
    skill_id: skill.id,
    assigned_level_code: 'senior',
    comment: 'Strong system design',
  })

  await ReviewEvidence.create({
    review_session_id: session.id,
    evidence_type: 'pull_request',
    url: 'https://example.com/evidence-1',
    title: 'Evidence 1',
    description: 'Initial evidence',
    uploaded_by: owner.id,
  })

  await db.table('task_self_assessments').insert({
    task_assignment_id: assignment.id,
    user_id: reviewee.id,
    overall_satisfaction: 4,
    difficulty_felt: 'as_expected',
    confidence_level: 5,
    what_went_well: 'Clear delivery',
    what_would_do_different: 'Earlier communication',
    blockers_encountered: JSON.stringify([]),
    skills_felt_lacking: JSON.stringify([]),
    skills_felt_strong: JSON.stringify(['typescript']),
    submitted_at: DateTime.now().plus({ days: 1 }).toSQL(),
    created_at: DateTime.now().toSQL(),
    updated_at: DateTime.now().toSQL(),
  })

  return { org, owner, reviewee, task, assignment, session }
}

test.group('Integration | User Work History', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('inserts materialized work history with quality, evidence, and self-assessment data', async ({
    assert,
  }) => {
    const { reviewee, task, assignment } = await seedCompletedAssignment()
    const command = new BuildUserWorkHistoryCommand(buildExecutionContext(reviewee.id))

    const result = await command.handle({
      userId: reviewee.id,
    })

    const row = await UserWorkHistory.query()
      .where('user_id', reviewee.id)
      .where('task_assignment_id', assignment.id)
      .firstOrFail()
    const auditLogs = await getLatestAuditSummary(reviewee.id)

    assert.equal(result.userId, reviewee.id)
    assert.equal(result.totalCompletedAssignments, 1)
    assert.equal(result.inserted, 1)
    assert.equal(result.updated, 0)
    assert.equal(row.task_id, task.id)
    assert.equal(row.task_title, task.title)
    assert.equal(row.estimated_hours, 8)
    assert.equal(row.actual_hours, 6)
    assert.isTrue(row.was_on_time ?? false)
    assert.equal(row.overall_quality_score, 4)
    assert.lengthOf(row.skill_scores, 1)
    assert.equal(row.skill_scores[0]?.skill_name, 'TypeScript')
    assert.equal(row.skill_scores[0]?.assigned_level_code, 'senior')
    assert.lengthOf(row.evidence_links, 1)
    assert.equal(row.evidence_links[0]?.evidence_type, 'pull_request')
    assert.equal(row.evidence_links[0]?.title, 'Evidence 1')
    assert.lengthOf(row.knowledge_artifacts, 2)
    assert.equal(row.knowledge_artifacts[0]?.type, 'retrospective_success')
    assert.equal(row.knowledge_artifacts[1]?.type, 'retrospective_improvement')
    assert.equal(row.estimated_business_value, 'team')
    assert.equal(auditLogs.length, 1)
    assert.equal(auditLogs[0]?.new_values?.full_rebuild, false)
    assert.equal(auditLogs[0]?.new_values?.inserted, 1)
    assert.equal(auditLogs[0]?.new_values?.updated, 0)
  })

  test('updates an existing work history row when source analytics change', async ({ assert }) => {
    const { reviewee, assignment, session } = await seedCompletedAssignment()
    const command = new BuildUserWorkHistoryCommand(buildExecutionContext(reviewee.id))

    const firstResult = await command.handle({
      userId: reviewee.id,
    })
    const before = await UserWorkHistory.query()
      .where('user_id', reviewee.id)
      .where('task_assignment_id', assignment.id)
      .firstOrFail()

    await session
      .merge({
        overall_quality_score: 2,
      })
      .save()

    await ReviewEvidence.create({
      review_session_id: session.id,
      evidence_type: 'document_link',
      url: 'https://example.com/evidence-2',
      title: 'Evidence 2',
      description: 'Follow-up evidence',
      uploaded_by: reviewee.id,
    })

    await TaskSelfAssessment.query().where('task_assignment_id', assignment.id).delete()
    await db.table('task_self_assessments').insert({
      task_assignment_id: assignment.id,
      user_id: reviewee.id,
      overall_satisfaction: 5,
      difficulty_felt: 'easier_than_expected',
      confidence_level: 4,
      what_went_well: 'Refined delivery',
      what_would_do_different: 'Nothing major',
      blockers_encountered: JSON.stringify([]),
      skills_felt_lacking: JSON.stringify([]),
      skills_felt_strong: JSON.stringify(['adonisjs']),
      submitted_at: DateTime.now().plus({ days: 1 }).toSQL(),
      created_at: DateTime.now().toSQL(),
      updated_at: DateTime.now().toSQL(),
    })

    const secondResult = await command.handle({
      userId: reviewee.id,
    })
    const after = await UserWorkHistory.query()
      .where('user_id', reviewee.id)
      .where('task_assignment_id', assignment.id)
      .firstOrFail()
    const auditLogs = await getLatestAuditSummary(reviewee.id)

    assert.equal(firstResult.inserted, 1)
    assert.equal(firstResult.updated, 0)
    assert.equal(secondResult.inserted, 0)
    assert.equal(secondResult.updated, 1)
    assert.equal(before.id, after.id)
    assert.equal(after.overall_quality_score, 2)
    assert.lengthOf(after.evidence_links, 2)
    assert.equal(after.evidence_links[1]?.title, 'Evidence 2')
    assert.lengthOf(after.knowledge_artifacts, 2)
    assert.equal(after.knowledge_artifacts[0]?.content, 'Refined delivery')
    assert.equal(after.knowledge_artifacts[1]?.content, 'Nothing major')
    assert.equal(auditLogs.length, 2)
    assert.equal(auditLogs[0]?.new_values?.inserted, 0)
    assert.equal(auditLogs[0]?.new_values?.updated, 1)
  })

  test('full rebuild removes stale rows and rebuilds from current completed assignments', async ({
    assert,
  }) => {
    const { reviewee, assignment } = await seedCompletedAssignment()
    const staleWorkHistoryId = testId()
    const staleTaskId = testId()
    const staleAssignmentId = testId()
    await UserWorkHistory.create({
      id: staleWorkHistoryId,
      user_id: reviewee.id,
      task_id: staleTaskId,
      task_assignment_id: staleAssignmentId,
      organization_id: null,
      project_id: null,
      task_title: 'Stale row',
      task_type: 'legacy',
      business_domain: 'legacy',
      problem_category: 'legacy',
      role_in_task: 'legacy',
      autonomy_level: 'legacy',
      collaboration_type: 'legacy',
      tech_stack: [],
      domain_tags: [],
      difficulty: null,
      estimated_hours: null,
      actual_hours: null,
      was_on_time: null,
      days_early_or_late: null,
      measurable_outcomes: [],
      estimated_business_value: null,
      knowledge_artifacts: [],
      overall_quality_score: null,
      skill_scores: [],
      evidence_links: [],
      completed_at: DateTime.now().minus({ days: 10 }),
      is_featured: false,
      is_public: false,
    })

    const command = new BuildUserWorkHistoryCommand(buildExecutionContext(reviewee.id))
    const result = await command.handle({
      userId: reviewee.id,
      fullRebuild: true,
    })

    const rows = await UserWorkHistory.query().where('user_id', reviewee.id)
    const rebuiltRow = rows.find((row) => row.task_assignment_id === assignment.id)
    const staleRow = rows.find((row) => row.task_assignment_id === staleAssignmentId)
    const auditLogs = await getLatestAuditSummary(reviewee.id)

    assert.equal(result.inserted, 1)
    assert.equal(result.updated, 0)
    assert.lengthOf(rows, 1)
    assert.isNotNull(rebuiltRow)
    assert.isUndefined(staleRow)
    assert.equal(auditLogs.length, 1)
    assert.equal(auditLogs[0]?.new_values?.full_rebuild, true)
  })
})
