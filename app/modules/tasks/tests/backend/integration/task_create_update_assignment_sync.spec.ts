import { test } from '@japa/runner'

import { taskExternalDeps } from '#composition/tasks/task-external-dependencies/task_external_dependencies_composition'
import UpdateTaskCommand from '#modules/tasks/actions/commands/task-authoring/update_task_command'
import UpdateTaskDTO from '#modules/tasks/actions/dtos/request/update_task_dto'
import type { TaskNotificationStager } from '#modules/tasks/actions/ports/outbound/task_notification_stager'
import { InProcessTaskEventPublisher } from '#modules/tasks/infra/adapters/task-authoring/in_process_task_event_publisher'
import { TaskCacheInvalidator } from '#modules/tasks/infra/adapters/task-authoring/task_cache_invalidator'
import Task from '#modules/tasks/infra/models/task-authoring/task'
import TaskAssignment from '#modules/tasks/infra/models/task-assignment/task_assignment'
import { AssignmentStatus } from '#modules/tasks/public_contracts/task_constants'
import CreateTaskScenario from '#modules/tasks/tests/backend/support/task-authoring/create_task_scenario'
import { UpdateTaskScenario } from '#modules/tasks/tests/backend/support/update_task_scenario'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { cleanupTestData } from '#tests/helpers/factories'

class FailingNotificationStager implements TaskNotificationStager {
  stage(): Promise<never> {
    return Promise.reject(new Error('assignment notification staging failed'))
  }
}

async function activeAssignments(taskId: string): Promise<TaskAssignment[]> {
  return TaskAssignment.query()
    .where('task_id', taskId)
    .where('assignment_status', AssignmentStatus.ACTIVE)
}

test.group('Integration | Task create/update assignment synchronization', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('create with assigned_to persists one matching active assignment', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const assignee = await scenario.createOrgMember()

    const task = await scenario.create({
      title: 'Assigned at creation',
      assigned_to: assignee.id,
    })

    const assignments = await activeAssignments(task.id)
    assert.lengthOf(assignments, 1)
    assert.equal(assignments[0]?.assignee_id, assignee.id)
    assert.equal(assignments[0]?.assigned_by, scenario.ownerId)
    const assignmentRecord = await taskExternalDeps.assignments.findActiveByTask(task.id)
    assert.equal(assignmentRecord?.assigned_by, scenario.ownerId)
    assert.match(assignmentRecord?.assigned_at ?? '', /^\d{4}-\d{2}-\d{2}T/)
  })

  test('update assign, reassign, and unassign keep assignment history aligned with tasks.assigned_to', async ({
    assert,
  }) => {
    const scenario = await UpdateTaskScenario.create()
    const firstAssignee = await scenario.createOrgMember()
    const secondAssignee = await scenario.createOrgMember()
    const task = await scenario.createTask({ assigned_to: null })

    await scenario.execute(task.id, new UpdateTaskDTO({ assigned_to: firstAssignee.id }))
    let active = await activeAssignments(task.id)
    assert.lengthOf(active, 1)
    assert.equal(active[0]?.assignee_id, firstAssignee.id)

    await scenario.execute(task.id, new UpdateTaskDTO({ assigned_to: secondAssignee.id }))
    active = await activeAssignments(task.id)
    assert.lengthOf(active, 1)
    assert.equal(active[0]?.assignee_id, secondAssignee.id)
    const cancelledFirst = await TaskAssignment.query()
      .where('task_id', task.id)
      .where('assignee_id', firstAssignee.id)
      .where('assignment_status', AssignmentStatus.CANCELLED)
      .first()
    assert.isNotNull(cancelledFirst)

    await scenario.execute(task.id, new UpdateTaskDTO({ assigned_to: null }))
    assert.lengthOf(await activeAssignments(task.id), 0)
    const unassignedTask = await Task.findOrFail(task.id)
    assert.isNull(unassignedTask.assigned_to)
  }).timeout(10_000)

  test('create notification failure rolls back both task and assignment', async ({ assert }) => {
    const scenario = await CreateTaskScenario.build()
    const assignee = await scenario.createOrgMember()
    const title = 'Rollback assigned create'

    await assert.rejects(
      () =>
        scenario.createWithNotificationStager(
          { title, assigned_to: assignee.id },
          new FailingNotificationStager()
        ),
      'assignment notification staging failed'
    )

    const task = await Task.query()
      .where('organization_id', scenario.organizationId)
      .where('title', title)
      .first()
    assert.isNull(task)
    assert.lengthOf(
      await TaskAssignment.query().where('assignee_id', assignee.id),
      0
    )
  })

  test('failed reassignment restores the previous active assignment and task cache', async ({
    assert,
  }) => {
    const scenario = await UpdateTaskScenario.create()
    const firstAssignee = await scenario.createOrgMember()
    const secondAssignee = await scenario.createOrgMember()
    const task = await scenario.createTask({ assigned_to: null })
    await scenario.execute(task.id, new UpdateTaskDTO({ assigned_to: firstAssignee.id }))

    await assert.rejects(
      () =>
        scenario.executeWithNotification(
          task.id,
          new UpdateTaskDTO({ assigned_to: secondAssignee.id }),
          scenario.owner.id,
          new FailingNotificationStager()
        ),
      'assignment notification staging failed'
    )

    const persistedTask = await Task.findOrFail(task.id)
    const active = await activeAssignments(task.id)
    assert.equal(persistedTask.assigned_to, firstAssignee.id)
    assert.lengthOf(active, 1)
    assert.equal(active[0]?.assignee_id, firstAssignee.id)
    assert.isNull(
      await TaskAssignment.query()
        .where('task_id', task.id)
        .where('assignee_id', secondAssignee.id)
        .first()
    )
  })

  test('partial assignment Contract dependency configuration fails closed and rolls reassignment back', async ({
    assert,
  }) => {
    const scenario = await UpdateTaskScenario.create()
    const firstAssignee = await scenario.createOrgMember()
    const secondAssignee = await scenario.createOrgMember()
    const task = await scenario.createTask({ assigned_to: null })
    await scenario.execute(task.id, new UpdateTaskDTO({ assigned_to: firstAssignee.id }))

    const { resolvedBrief: _missingResolvedBrief, ...partialDependencies } = taskExternalDeps
    const command = new UpdateTaskCommand(
      scenario.buildActionContext(scenario.owner.id),
      partialDependencies,
      scenario.createNotificationSpy(),
      new TaskCacheInvalidator(),
      new InProcessTaskEventPublisher()
    )

    await assert.rejects(
      () => command.execute(task.id, new UpdateTaskDTO({ assigned_to: secondAssignee.id })),
      'task_resolved_brief_reader dependency failed during synchronize_assignment_contract'
    )

    const persistedTask = await Task.findOrFail(task.id)
    const active = await activeAssignments(task.id)
    assert.equal(persistedTask.assigned_to, firstAssignee.id)
    assert.lengthOf(active, 1)
    assert.equal(active[0]?.assignee_id, firstAssignee.id)
    assert.isNull(
      await TaskAssignment.query()
        .where('task_id', task.id)
        .where('assignee_id', secondAssignee.id)
        .first()
    )
  })

  test('concurrent assignment updates serialize to one active row matching tasks.assigned_to', async ({
    assert,
  }) => {
    const scenario = await UpdateTaskScenario.create()
    const firstAssignee = await scenario.createOrgMember()
    const secondAssignee = await scenario.createOrgMember()
    const task = await scenario.createTask({ assigned_to: null })

    await Promise.all([
      scenario.execute(task.id, new UpdateTaskDTO({ assigned_to: firstAssignee.id })),
      scenario.execute(task.id, new UpdateTaskDTO({ assigned_to: secondAssignee.id })),
    ])

    const persistedTask = await Task.findOrFail(task.id)
    const active = await activeAssignments(task.id)
    assert.lengthOf(active, 1)
    assert.equal(active[0]?.assignee_id, persistedTask.assigned_to)
  })
})
