import { test } from '@japa/runner'

import {
  collectTaskUserIdentityIds,
  mapTaskDetailUserProjections,
  mapTaskListUserProjections,
} from '#modules/tasks/actions/mapper/task_user_projection_mapper'

const identities = [
  { id: 'assignee-1', username: 'Assignee', email: 'assignee@example.test' },
  { id: 'creator-1', username: 'Creator', email: 'creator@example.test' },
]

test.group('Unit | Task user identity projection', () => {
  test('deduplicates list identities and applies the list allowlist', ({ assert }) => {
    const sources = [
      {
        id: 'task-1',
        assigned_to: 'assignee-1',
        creator_id: 'creator-1',
        updated_by: 'assignee-1',
      },
    ]
    assert.deepEqual(collectTaskUserIdentityIds(sources, false), [
      'assignee-1',
      'creator-1',
    ])
    const [task] = mapTaskListUserProjections(sources, identities)
    assert.deepEqual(task?.assignee, {
      id: 'assignee-1',
      username: 'Assignee',
      email: 'assignee@example.test',
    })
    assert.deepEqual(task?.creator, {
      id: 'creator-1',
      username: 'Creator',
    })
    assert.notProperty(task ?? {}, 'updater')
  })

  test('returns null for missing detail identities without changing scalar ids', ({
    assert,
  }) => {
    const sources = [
      {
        id: 'task-1',
        assigned_to: 'missing-user',
        creator_id: 'creator-1',
        updated_by: 'missing-user',
      },
    ]
    assert.deepEqual(collectTaskUserIdentityIds(sources, true), [
      'missing-user',
      'creator-1',
    ])
    const [task] = mapTaskDetailUserProjections(sources, identities)
    assert.equal(task?.assigned_to, 'missing-user')
    assert.equal(task?.updated_by, 'missing-user')
    assert.isNull(task?.assignee)
    assert.isNull(task?.updater)
    assert.deepEqual(task?.creator, {
      id: 'creator-1',
      username: 'Creator',
      email: 'creator@example.test',
    })
  })
})
