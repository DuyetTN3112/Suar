import crypto from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import { taskFactSourceReader } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import ListAssignmentDeliveryFactsV1Query from '#modules/tasks/actions/queries/task-assignment/list_assignment_delivery_facts_v1_query'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  ProjectFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

test.group('Integration | Assignment Delivery Fact Exporter', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('exports active and completed facts while excluding foreign and deleted tasks', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const project = await ProjectFactory.create({ organization_id: org.id })
    const target = await UserFactory.create()
    const otherUser = await UserFactory.create()
    const activeAssignedAt = DateTime.utc(2026, 7, 18, 8)
    const completedAssignedAt = DateTime.utc(2026, 7, 19, 8)
    const completedAt = DateTime.utc(2026, 7, 20, 8)
    const dueDate = DateTime.utc(2026, 7, 21, 8)

    const activeTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
    })
    const activeAssignment = await TaskAssignmentFactory.create({
      task_id: activeTask.id,
      assignee_id: target.id,
      assigned_by: owner.id,
      assignment_status: 'active',
      estimated_hours: 4.5,
    })
    await db
      .from('task_assignments')
      .where('id', activeAssignment.id)
      .update({ assigned_at: activeAssignedAt.toJSDate() })
    await db.table('task_review_workflows').insert({
      id: crypto.randomUUID(),
      task_id: activeTask.id,
      project_id: project.id,
      organization_id: org.id,
      task_assignment_id: activeAssignment.id,
      reviewee_id: target.id,
      status: 'done',
    })

    const completedTask = await TaskFactory.create({
      project_id: project.id,
      organization_id: org.id,
      creator_id: owner.id,
      due_date: dueDate,
    })
    const completedAssignment = await TaskAssignmentFactory.create({
      task_id: completedTask.id,
      assignee_id: target.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
      estimated_hours: 7,
    })
    await db
      .from('task_assignments')
      .where('id', completedAssignment.id)
      .update({
        actual_hours: 6.25,
        assigned_at: completedAssignedAt.toJSDate(),
        completed_at: completedAt.toJSDate(),
      })
    await db.table('task_review_workflows').insert({
      id: crypto.randomUUID(),
      task_id: completedTask.id,
      project_id: project.id,
      organization_id: org.id,
      task_assignment_id: completedAssignment.id,
      reviewee_id: target.id,
      status: 'done',
    })

    const foreignTask = await TaskFactory.create({
      project_id: project.id,
      organization_id: org.id,
      creator_id: owner.id,
    })
    const foreignAssignment = await TaskAssignmentFactory.create({
      task_id: foreignTask.id,
      assignee_id: otherUser.id,
      assigned_by: owner.id,
      assignment_status: 'active',
    })
    await db.table('task_review_workflows').insert({
      id: crypto.randomUUID(),
      task_id: foreignTask.id,
      project_id: project.id,
      organization_id: org.id,
      task_assignment_id: foreignAssignment.id,
      reviewee_id: otherUser.id,
      status: 'done',
    })

    const deletedTask = await TaskFactory.create({
      project_id: project.id,
      organization_id: org.id,
      creator_id: owner.id,
    })
    await db
      .from('tasks')
      .where('id', deletedTask.id)
      .update({ deleted_at: DateTime.now().toJSDate() })
    const deletedAssignment = await TaskAssignmentFactory.create({
      task_id: deletedTask.id,
      assignee_id: target.id,
      assigned_by: owner.id,
      assignment_status: 'active',
    })
    await db.table('task_review_workflows').insert({
      id: crypto.randomUUID(),
      task_id: deletedTask.id,
      project_id: project.id,
      organization_id: org.id,
      task_assignment_id: deletedAssignment.id,
      reviewee_id: target.id,
      status: 'done',
    })

    const facts = await new ListAssignmentDeliveryFactsV1Query(
      taskFactSourceReader
    ).execute(target.id)

    assert.deepEqual(facts, [
      {
        contractVersion: 1,
        assignmentId: activeAssignment.id,
        taskId: activeTask.id,
        assigneeId: target.id,
        assignmentStatus: 'active',
        estimatedHours: 4.5,
        actualHours: null,
        assignedAt: activeAssignedAt.toISO(),
        completedAt: null,
        taskDueDate: activeTask.due_date?.toUTC().toISO() ?? null,
      },
      {
        contractVersion: 1,
        assignmentId: completedAssignment.id,
        taskId: completedTask.id,
        assigneeId: target.id,
        assignmentStatus: 'completed',
        estimatedHours: 7,
        actualHours: 6.25,
        assignedAt: completedAssignedAt.toISO(),
        completedAt: completedAt.toISO(),
        taskDueDate: dueDate.toISO(),
      },
    ])
    assert.notProperty(facts[0] ?? {}, '$attributes')
    assert.notProperty(facts[1] ?? {}, '$attributes')
  })

  test('fails closed for an invalid user id', async ({ assert }) => {
    assert.deepEqual(
      await new ListAssignmentDeliveryFactsV1Query(taskFactSourceReader).execute(
        'not-a-uuid'
      ),
      []
    )
  })
})
