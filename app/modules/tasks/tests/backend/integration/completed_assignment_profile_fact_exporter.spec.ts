import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { taskFactSourceReader } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import ListCompletedAssignmentProfileFactsV1Query from '#modules/tasks/actions/queries/task-assignment/list_completed_assignment_profile_facts_v1_query'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

test.group('Integration | Completed Assignment Profile Fact Exporter', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  async function insertLegacySnapshot(input: {
    assignmentId: string
    taskId: string
    snapshot: Record<string, unknown>
  }) {
    const snapshotId = randomUUID()
    await db.table('task_assignment_snapshots').insert({
      id: snapshotId,
      task_assignment_id: input.assignmentId,
      task_id: input.taskId,
      snapshot_reason: 'submitted',
      task_snapshot: JSON.stringify(input.snapshot),
      required_skills_snapshot: JSON.stringify([]),
      acceptance_criteria_snapshot: JSON.stringify({}),
      workflow_snapshot: JSON.stringify({ assignment_status: 'completed' }),
    })
    return snapshotId
  }

  async function insertTaskReviewWorkflow(input: {
    taskId: string
    assignmentId: string
    projectId: string
    organizationId: string
    revieweeId: string
    status?: 'awaiting_review' | 'done'
  }) {
    const now = DateTime.utc(2026, 7, 20, 9).toISO()
    await db.table('task_review_workflows').insert({
      id: randomUUID(),
      task_id: input.taskId,
      task_assignment_id: input.assignmentId,
      project_id: input.projectId,
      organization_id: input.organizationId,
      reviewee_id: input.revieweeId,
      status: input.status ?? 'done',
      required_review_count: 1,
      completed_review_count: 1,
      created_at: now,
      updated_at: now,
    })
  }

  test('exports immutable assignment facts instead of rereading mutable task rows', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const target = await UserFactory.create()
    const otherUser = await UserFactory.create()
    const dueDate = DateTime.utc(2026, 7, 20, 9)
    const completedAt = DateTime.utc(2026, 7, 19, 9)
    const includedTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Profile source task',
      difficulty: 'hard',
      estimated_time: 12,
      actual_time: 10,
      due_date: dueDate,
    })
    await db
      .from('tasks')
      .where('id', includedTask.id)
      .update({
        task_type: 'architecture_design',
        business_domain: 'fintech',
        problem_category: 'scalability',
        role_in_task: 'architect',
        autonomy_level: 'autonomous',
        collaboration_type: 'cross_team',
        tech_stack: JSON.stringify(['TypeScript', 'PostgreSQL']),
        domain_tags: JSON.stringify(['payments']),
        measurable_outcomes: JSON.stringify([{ metric: 'latency', delta: -20 }]),
        impact_scope: 'organization',
      })
    const includedAssignment = await TaskAssignmentFactory.create({
      task_id: includedTask.id,
      assignee_id: target.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
      estimated_hours: 11.5,
    })
    await db.from('task_assignments').where('id', includedAssignment.id).update({
      actual_hours: 9.25,
      completed_at: completedAt.toJSDate(),
    })
    await insertLegacySnapshot({
      assignmentId: includedAssignment.id,
      taskId: includedTask.id,
      snapshot: {
        id: includedTask.id,
        title: 'Profile source task',
        organization_id: org.id,
        project_id: includedTask.project_id,
        task_type: 'architecture_design',
        business_domain: 'fintech',
        problem_category: 'scalability',
        role_in_task: 'architect',
        autonomy_level: 'autonomous',
        collaboration_type: 'cross_team',
        tech_stack: ['TypeScript', 'PostgreSQL'],
        domain_tags: ['payments'],
        difficulty: 'hard',
        estimated_time: 12,
        actual_time: 10,
        measurable_outcomes: [{ metric: 'latency', delta: -20 }],
        impact_scope: 'organization',
        due_date: dueDate.toISO(),
      },
    })
    await insertTaskReviewWorkflow({
      taskId: includedTask.id,
      assignmentId: includedAssignment.id,
      projectId: includedTask.project_id,
      organizationId: org.id,
      revieweeId: target.id,
    })

    const awaitingReviewTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      title: 'Completed task awaiting final review',
    })
    const awaitingReviewAssignment = await TaskAssignmentFactory.create({
      task_id: awaitingReviewTask.id,
      assignee_id: target.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    await db.from('task_assignments').where('id', awaitingReviewAssignment.id).update({
      completed_at: completedAt.toJSDate(),
    })
    await insertLegacySnapshot({
      assignmentId: awaitingReviewAssignment.id,
      taskId: awaitingReviewTask.id,
      snapshot: {
        id: awaitingReviewTask.id,
        title: 'Completed task awaiting final review',
        organization_id: org.id,
        project_id: awaitingReviewTask.project_id,
        tech_stack: [],
        domain_tags: [],
        measurable_outcomes: [],
      },
    })
    await insertTaskReviewWorkflow({
      taskId: awaitingReviewTask.id,
      assignmentId: awaitingReviewAssignment.id,
      projectId: awaitingReviewTask.project_id,
      organizationId: org.id,
      revieweeId: target.id,
      status: 'awaiting_review',
    })
    await db
      .from('tasks')
      .where('id', includedTask.id)
      .update({
        title: 'Mutated after completion',
        tech_stack: JSON.stringify(['Forged']),
        business_domain: 'fintech',
      })

    const activeTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    await TaskAssignmentFactory.create({
      task_id: activeTask.id,
      assignee_id: target.id,
      assigned_by: owner.id,
      assignment_status: 'active',
    })

    const foreignTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    await TaskAssignmentFactory.create({
      task_id: foreignTask.id,
      assignee_id: otherUser.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })

    const deletedTask = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    await db
      .from('tasks')
      .where('id', deletedTask.id)
      .update({ deleted_at: DateTime.now().toJSDate() })
    await TaskAssignmentFactory.create({
      task_id: deletedTask.id,
      assignee_id: target.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    const deletedAssignment = (await db
      .from('task_assignments')
      .where({ task_id: deletedTask.id, assignee_id: target.id })
      .select('id')
      .firstOrFail()) as unknown as { id: string }
    await insertLegacySnapshot({
      assignmentId: deletedAssignment.id,
      taskId: deletedTask.id,
      snapshot: {
        id: deletedTask.id,
        title: 'Deleted task historical title',
        organization_id: org.id,
        project_id: deletedTask.project_id,
        task_type: 'historical_task',
        tech_stack: [],
        domain_tags: [],
        measurable_outcomes: [],
      },
    })
    await insertTaskReviewWorkflow({
      taskId: deletedTask.id,
      assignmentId: deletedAssignment.id,
      projectId: deletedTask.project_id,
      organizationId: org.id,
      revieweeId: target.id,
    })

    const facts = await new ListCompletedAssignmentProfileFactsV1Query(
      taskFactSourceReader
    ).execute(target.id)

    assert.lengthOf(facts, 2)
    assert.deepEqual(facts[0], {
      contractVersion: 1,
      taskAssignmentId: includedAssignment.id,
      taskId: includedTask.id,
      organizationId: org.id,
      projectId: includedTask.project_id,
      taskTitle: 'Profile source task',
      taskType: 'architecture_design',
      businessDomain: 'fintech',
      problemCategory: 'scalability',
      roleInTask: 'architect',
      autonomyLevel: 'autonomous',
      collaborationType: 'cross_team',
      techStack: ['TypeScript', 'PostgreSQL'],
      domainTags: ['payments'],
      difficulty: 'hard',
      estimatedTime: 12,
      actualTime: 10,
      assignmentEstimatedHours: 11.5,
      assignmentActualHours: 9.25,
      dueDate: dueDate.toISO(),
      completedAt: completedAt.toISO(),
      measurableOutcomes: [{ metric: 'latency', delta: -20 }],
      impactScope: 'organization',
    })
    assert.notProperty(facts[0] ?? {}, '$attributes')
    assert.equal(facts[1]?.taskAssignmentId, deletedAssignment.id)
    assert.equal(facts[1]?.taskTitle, 'Deleted task historical title')
  })

  test('fails closed when a persisted task JSON array violates its contract', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const target = await UserFactory.create()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: target.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    const snapshotId = await insertLegacySnapshot({
      assignmentId: assignment.id,
      taskId: task.id,
      snapshot: {
        id: task.id,
        title: task.title,
        organization_id: org.id,
        tech_stack: 'database-password-do-not-log',
        domain_tags: [],
        measurable_outcomes: [],
      },
    })
      await insertTaskReviewWorkflow({
      taskId: task.id,
      assignmentId: assignment.id,
      projectId: task.project_id,
      organizationId: org.id,
      revieweeId: target.id,
    })

    let thrown: unknown
    try {
      await new ListCompletedAssignmentProfileFactsV1Query(taskFactSourceReader).execute(target.id)
    } catch (error) {
      thrown = error
    }

    assert.instanceOf(thrown, PersistedDataIntegrityException)
    assert.deepInclude((thrown as PersistedDataIntegrityException).details, {
      table: 'task_assignment_snapshots',
      record_id: snapshotId,
      field: 'task_snapshot.tech_stack',
      expected_shape: 'string_array',
      reason: 'invalid_json',
    })
    assert.notInclude(JSON.stringify(thrown), 'database-password-do-not-log')
  })
})
