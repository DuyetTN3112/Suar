import { test } from '@japa/runner'

import {
  DOCUMENTATION_TASK_STATUS_SLUG,
  DEFAULT_TASK_STATUSES,
  TaskStatusCategory,
  TERMINAL_STATUS_CATEGORIES,
} from '#modules/tasks/public_contracts/task_constants'

test.group('Task domain invariants', () => {
  test('starter task statuses preserve their category invariants', ({ assert }) => {
    const defaultStatuses = DEFAULT_TASK_STATUSES.filter((status) => status.is_default)
    assert.lengthOf(defaultStatuses, 1)
    assert.equal(defaultStatuses[0]?.slug, 'todo')
    assert.equal(defaultStatuses[0]?.category, TaskStatusCategory.TODO)
    assert.deepEqual(
      new Set(DEFAULT_TASK_STATUSES.map((status) => status.slug)).size,
      DEFAULT_TASK_STATUSES.length
    )
    assert.deepEqual(
      new Set(DEFAULT_TASK_STATUSES.map((status) => status.sort_order)).size,
      DEFAULT_TASK_STATUSES.length
    )

    assert.deepEqual(
      [...TERMINAL_STATUS_CATEGORIES].sort(),
      [TaskStatusCategory.CANCELLED, TaskStatusCategory.DONE].sort()
    )

    const docsStatus = DEFAULT_TASK_STATUSES.find(
      (status) => status.slug === DOCUMENTATION_TASK_STATUS_SLUG
    )
    assert.deepInclude(docsStatus, {
      category: TaskStatusCategory.DOCS,
      is_default: false,
      is_system: true,
      sort_order: 0,
    })
  })
})
