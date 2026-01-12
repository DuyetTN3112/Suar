import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { taskFactSourceReader } from '#composition/task_external_dependencies_composition'
import PersistedDataIntegrityException from '#modules/errors/public_contracts/persisted_data_integrity_exception'
import ListCompletedAssignmentProfileFactsV1Query from '#modules/tasks/actions/queries/list_completed_assignment_profile_facts_v1_query'
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

  test('exports one pure rich fact and excludes foreign, active, and deleted assignments', async ({
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
    await db
      .from('task_assignments')
      .where('id', includedAssignment.id)
      .update({
        actual_hours: 9.25,
        completed_at: completedAt.toJSDate(),
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

    const facts = await new ListCompletedAssignmentProfileFactsV1Query(
      taskFactSourceReader
    ).execute(target.id)

    assert.lengthOf(facts, 1)
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
    await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: target.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })
    await db
      .from('tasks')
      .where('id', task.id)
      .update({
        tech_stack: db.raw('?::jsonb', [JSON.stringify('database-password-do-not-log')]),
      })

    let thrown: unknown
    try {
      await new ListCompletedAssignmentProfileFactsV1Query(
        taskFactSourceReader
      ).execute(target.id)
    } catch (error) {
      thrown = error
    }

    assert.instanceOf(thrown, PersistedDataIntegrityException)
    assert.deepInclude((thrown as PersistedDataIntegrityException).details, {
      table: 'tasks',
      record_id: task.id,
      field: 'tech_stack',
      expected_shape: 'string_array',
      reason: 'invalid_json',
    })
    assert.notInclude(JSON.stringify(thrown), 'database-password-do-not-log')
  })
})
