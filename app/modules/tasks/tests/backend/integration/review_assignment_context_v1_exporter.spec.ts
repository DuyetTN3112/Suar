import { randomUUID } from 'node:crypto'

import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'
import { DateTime } from 'luxon'

import ReviewAssignmentContextV1Query from '#modules/tasks/actions/queries/task-applications/review_assignment_context_v1_query'
import { LucidTaskFactSourceReader } from '#modules/tasks/infra/adapters/task-reading/lucid_task_fact_source_reader'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  ProjectFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

const reviewAssignmentContexts = new ReviewAssignmentContextV1Query(
  new LucidTaskFactSourceReader()
)
const findReviewAssignmentContextsV1 =
  reviewAssignmentContexts.find.bind(reviewAssignmentContexts)
const listAssignmentIdsByProjectIds =
  reviewAssignmentContexts.listAssignmentIdsByProjectIds.bind(
    reviewAssignmentContexts
  )
const listAssignmentIdsByProjectIdsIncludingDeletedTasks =
  reviewAssignmentContexts.listAssignmentIdsByProjectIdsIncludingDeletedTasks.bind(
    reviewAssignmentContexts
  )
const listAssignmentIdsByTaskIds =
  reviewAssignmentContexts.listAssignmentIdsByTaskIds.bind(reviewAssignmentContexts)
const listAssignmentIdsByTaskStatusIds =
  reviewAssignmentContexts.listAssignmentIdsByTaskStatusIds.bind(
    reviewAssignmentContexts
  )

test.group('Integration | Review Assignment Context V1 Exporter', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('exports deduplicated scalar historical contexts through the supplied transaction', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const assignee = await UserFactory.create()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const dueDate = DateTime.utc(2026, 7, 26, 9, 30)
    const task = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
      title: 'Historical review source',
      description: 'Only review-safe task fields should leave Tasks',
      status: 'in_progress',
      priority: 'high',
      difficulty: 'hard',
      due_date: dueDate,
    })
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: assignee.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
      estimated_hours: 8.5,
    })
    const secondAssignee = await UserFactory.create()
    const secondAssignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: secondAssignee.id,
      assigned_by: owner.id,
      assignment_status: 'cancelled',
    })
    await db
      .from('tasks')
      .where('id', task.id)
      .update({ deleted_at: DateTime.utc(2026, 7, 27).toJSDate() })

    let facts = [] as Awaited<ReturnType<typeof findReviewAssignmentContextsV1>>
    await db.transaction(async (trx) => {
      await trx
        .from('task_assignments')
        .where('id', assignment.id)
        .update({ actual_hours: 7.25, completion_notes: 'Accepted in review transaction' })

      facts = await findReviewAssignmentContextsV1(
        [secondAssignment.id, assignment.id, 'not-a-uuid', randomUUID(), assignment.id],
        trx
      )
    })

    assert.deepEqual(
      facts.map((fact) => fact.id),
      [assignment.id, secondAssignment.id].sort()
    )
    assert.deepEqual(
      facts.find((fact) => fact.id === assignment.id),
      {
        contractVersion: 1,
        id: assignment.id,
        taskId: task.id,
        assigneeId: assignee.id,
        assignmentStatus: 'completed',
        estimatedHours: 8.5,
        actualHours: 7.25,
        completionNotes: 'Accepted in review transaction',
        task: {
          id: task.id,
          title: 'Historical review source',
          description: 'Only review-safe task fields should leave Tasks',
          status: 'in_progress',
          priority: 'high',
          difficulty: 'hard',
          dueDate: dueDate.toISO(),
          projectId: project.id,
          organizationId: org.id,
        },
      }
    )
    assert.notProperty(facts[0] ?? {}, '$attributes')
    assert.notProperty(facts[0]?.task ?? {}, '$attributes')
  })

  test('scopes assignment ids without leaking deleted tasks into project or status scopes', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const assignee = await UserFactory.create()
    const project = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const includedTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
    })
    const includedAssignment = await TaskAssignmentFactory.create({
      task_id: includedTask.id,
      assignee_id: assignee.id,
      assigned_by: owner.id,
      assignment_status: 'active',
    })
    const deletedTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: project.id,
      creator_id: owner.id,
      task_status_id: includedTask.task_status_id,
    })
    const deletedAssignment = await TaskAssignmentFactory.create({
      task_id: deletedTask.id,
      assignee_id: assignee.id,
      assigned_by: owner.id,
      assignment_status: 'cancelled',
    })
    await db
      .from('tasks')
      .where('id', deletedTask.id)
      .update({ deleted_at: DateTime.utc(2026, 7, 26).toJSDate() })

    const foreignProject = await ProjectFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
      owner_id: owner.id,
    })
    const foreignTask = await TaskFactory.create({
      organization_id: org.id,
      project_id: foreignProject.id,
      creator_id: owner.id,
      task_status_id: includedTask.task_status_id,
    })
    const foreignAssignment = await TaskAssignmentFactory.create({
      task_id: foreignTask.id,
      assignee_id: assignee.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })

    assert.deepEqual(
      await listAssignmentIdsByTaskIds([
        deletedTask.id,
        deletedTask.id,
        'not-a-uuid',
      ]),
      [deletedAssignment.id]
    )
    assert.deepEqual(
      await listAssignmentIdsByProjectIds([project.id, 'not-a-uuid', project.id]),
      [includedAssignment.id]
    )
    assert.deepEqual(
      await listAssignmentIdsByProjectIdsIncludingDeletedTasks([
        project.id,
        'not-a-uuid',
        project.id,
      ]),
      [includedAssignment.id, deletedAssignment.id].sort()
    )
    const includedTaskStatusId = includedTask.task_status_id ?? ''
    assert.isNotEmpty(includedTaskStatusId)
    assert.sameMembers(
      await listAssignmentIdsByTaskStatusIds([
        includedTaskStatusId,
        includedTaskStatusId,
      ]),
      [includedAssignment.id, foreignAssignment.id]
    )
  })

  test('fails closed for empty or invalid id collections', async ({ assert }) => {
    assert.deepEqual(await findReviewAssignmentContextsV1(['invalid']), [])
    assert.deepEqual(await listAssignmentIdsByTaskIds([]), [])
    assert.deepEqual(await listAssignmentIdsByProjectIds(['invalid']), [])
    assert.deepEqual(
      await listAssignmentIdsByProjectIdsIncludingDeletedTasks(['invalid']),
      []
    )
    assert.deepEqual(await listAssignmentIdsByTaskStatusIds(['invalid']), [])
  })
})
