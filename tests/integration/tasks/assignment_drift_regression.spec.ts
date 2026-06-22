import { test } from '@japa/runner'

import AssignTaskCommand from '#modules/tasks/actions/commands/assign_task_command'
import AssignTaskDTO from '#modules/tasks/actions/dtos/request/assign_task_dto'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { taskExternalDeps } from '#modules/tasks/bootstrap/task_composition_root'
import { TaskCacheInvalidator } from '#modules/tasks/infra/cache/task_cache_invalidator'
import Task from '#modules/tasks/infra/models/task'
import TaskAssignment from '#modules/tasks/infra/models/task_assignment'
import { AssignmentStatus } from '#modules/tasks/public_contracts/task_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  cleanupTestData,
  OrganizationFactory,
  OrganizationUserFactory,
  TaskFactory,
  UserFactory,
} from '#tests/helpers/factories'

function buildActionContext(userId: string, organizationId: string): TaskActionContext {
  return {
    userId,
    ip: '127.0.0.1',
    userAgent: 'integration-test',
    organizationId,
  }
}

test.group('Integration | Assignment Drift Regression', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('manual assign creates active task_assignments row and sets tasks.assigned_to', async ({
    assert,
  }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })

    const dto = new AssignTaskDTO({
      task_id: task.id,
      assigned_to: member.id,
    })

    const cmd = new AssignTaskCommand(
      buildActionContext(owner.id, org.id),
      { handle: () => Promise.resolve(null) },
      taskExternalDeps,
      new TaskCacheInvalidator(),
    )

    await cmd.execute(dto)

    // Verify task_assignments row
    const assignment = await TaskAssignment.query()
      .where('task_id', task.id)
      .where('assignee_id', member.id)
      .where('assignment_status', AssignmentStatus.ACTIVE)
      .first()

    assert.isNotNull(assignment, 'active task_assignments row must exist')
    assert.equal(assignment?.assigned_by, owner.id)

    // Verify tasks.assigned_to cache
    const updatedTask = await Task.find(task.id)
    assert.isNotNull(updatedTask)
    assert.equal(updatedTask?.assigned_to, member.id)
  })

  test('reassign cancels old active assignment and creates new one', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const memberA = await UserFactory.create()
    const memberB = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: memberA.id,
      org_role: 'org_member',
      status: 'approved',
    })
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: memberB.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })

    const makeCmd = () =>
      new AssignTaskCommand(
        buildActionContext(owner.id, org.id),
        { handle: () => Promise.resolve(null) },
        taskExternalDeps,
        new TaskCacheInvalidator(),
      )

    // Assign to A
    await makeCmd().execute(new AssignTaskDTO({ task_id: task.id, assigned_to: memberA.id }))

    // Reassign to B
    await makeCmd().execute(new AssignTaskDTO({ task_id: task.id, assigned_to: memberB.id }))

    // Verify A's assignment is cancelled
    const oldAssignment = await TaskAssignment.query()
      .where('task_id', task.id)
      .where('assignee_id', memberA.id)
      .first()
    assert.isNotNull(oldAssignment)
    assert.equal(oldAssignment?.assignment_status, AssignmentStatus.CANCELLED)

    // Verify B's assignment is active
    const newAssignment = await TaskAssignment.query()
      .where('task_id', task.id)
      .where('assignee_id', memberB.id)
      .where('assignment_status', AssignmentStatus.ACTIVE)
      .first()
    assert.isNotNull(newAssignment, 'new active assignment must exist')

    // Verify cache points to B
    const updatedTask = await Task.find(task.id)
    assert.equal(updatedTask?.assigned_to, memberB.id)
  })

  test('unassign cancels active assignment and clears cache', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })

    const makeCmd = () =>
      new AssignTaskCommand(
        buildActionContext(owner.id, org.id),
        { handle: () => Promise.resolve(null) },
        taskExternalDeps,
        new TaskCacheInvalidator(),
      )

    // Assign
    await makeCmd().execute(new AssignTaskDTO({ task_id: task.id, assigned_to: member.id }))

    // Unassign
    await makeCmd().execute(new AssignTaskDTO({ task_id: task.id, assigned_to: null }))

    // Verify no active assignment
    const activeAssignments = await TaskAssignment.query()
      .where('task_id', task.id)
      .where('assignment_status', AssignmentStatus.ACTIVE)
      .exec()
    assert.lengthOf(activeAssignments, 0, 'no active assignment should exist after unassign')

    // Verify cache cleared
    const updatedTask = await Task.find(task.id)
    assert.isNull(updatedTask?.assigned_to)
  })

  test('assignment drift does not occur when assignee is same as current', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const member = await UserFactory.create()
    await OrganizationUserFactory.create({
      organization_id: org.id,
      user_id: member.id,
      org_role: 'org_member',
      status: 'approved',
    })
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })

    const makeCmd = () =>
      new AssignTaskCommand(
        buildActionContext(owner.id, org.id),
        { handle: () => Promise.resolve(null) },
        taskExternalDeps,
        new TaskCacheInvalidator(),
      )

    // Assign to member
    await makeCmd().execute(new AssignTaskDTO({ task_id: task.id, assigned_to: member.id }))

    // Count assignments — should be exactly 1 active
    const assignmentsBefore = await TaskAssignment.query()
      .where('task_id', task.id)
      .exec()
    const activeBefore = assignmentsBefore.filter(
      (a) => (a.assignment_status as AssignmentStatus) === AssignmentStatus.ACTIVE,
    )
    assert.lengthOf(activeBefore, 1)

    // "Reassign" to same member — should cancel old + create new, still 1 active
    await makeCmd().execute(new AssignTaskDTO({ task_id: task.id, assigned_to: member.id }))

    const assignmentsAfter = await TaskAssignment.query()
      .where('task_id', task.id)
      .exec()
    const activeAfter = assignmentsAfter.filter(
      (a) => (a.assignment_status as AssignmentStatus) === AssignmentStatus.ACTIVE,
    )
    assert.lengthOf(activeAfter, 1, 'reassign to same user should still have exactly 1 active')
  })
})
