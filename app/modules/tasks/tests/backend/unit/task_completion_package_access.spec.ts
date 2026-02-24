import { test } from '@japa/runner'

import type { TaskCompletionAccessTask } from '#modules/tasks/actions/services/task_completion_access_resolver'
import { canMutateTaskCompletionPackage } from '#modules/tasks/domain/task_completion_access_policy'

const task: TaskCompletionAccessTask = {
  id: 'task-under-test',
  organization_id: 'org-under-test',
  creator_id: 'task-creator',
  assigned_to: 'task-assignee',
}

test.group('Unit | Task completion package access', () => {
  test('approved organization membership is not a mutation ownership class', ({ assert }) => {
    assert.isFalse(
      canMutateTaskCompletionPackage(
        'approved-member',
        {
          creatorId: task.creator_id,
          assignedTo: task.assigned_to,
        },
        ['resource-owner']
      )
    )
  })

  test('resource owner, task creator, and task assignee are mutation ownership classes', ({
    assert,
  }) => {
    const ownership = {
      creatorId: task.creator_id,
      assignedTo: task.assigned_to,
    }
    assert.isTrue(canMutateTaskCompletionPackage('resource-owner', ownership, ['resource-owner']))
    assert.isTrue(canMutateTaskCompletionPackage('task-creator', ownership, ['resource-owner']))
    assert.isTrue(canMutateTaskCompletionPackage('task-assignee', ownership, ['resource-owner']))
  })
})
