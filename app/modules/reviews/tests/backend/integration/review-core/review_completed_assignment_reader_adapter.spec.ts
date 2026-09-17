import { test } from '@japa/runner'

import { TaskReviewCompletedAssignmentReaderAdapter } from '#composition/adapters/tasks/task_review_completed_assignment_reader_adapter'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import {
  OrganizationFactory,
  TaskAssignmentFactory,
  TaskFactory,
  UserFactory,
  cleanupTestData,
} from '#tests/helpers/factories'

test.group('Integration | Review completed assignment reader adapter', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('returns the completed assignment and Tasks-owned creator fact', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const assignee = await UserFactory.create()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: assignee.id,
      assigned_by: owner.id,
      assignment_status: 'completed',
    })

    const result = await new TaskReviewCompletedAssignmentReaderAdapter().findCompletedAssignment(
      assignment.id
    )

    assert.deepEqual(result, {
      id: assignment.id,
      taskId: task.id,
      assigneeId: assignee.id,
      taskCreatorId: owner.id,
    })
  })

  test('does not expose a non-completed assignment', async ({ assert }) => {
    const { org, owner } = await OrganizationFactory.createWithOwner()
    const assignee = await UserFactory.create()
    const task = await TaskFactory.create({
      organization_id: org.id,
      creator_id: owner.id,
    })
    const assignment = await TaskAssignmentFactory.create({
      task_id: task.id,
      assignee_id: assignee.id,
      assigned_by: owner.id,
      assignment_status: 'active',
    })

    const result = await new TaskReviewCompletedAssignmentReaderAdapter().findCompletedAssignment(
      assignment.id
    )

    assert.isNull(result)
  })
})
