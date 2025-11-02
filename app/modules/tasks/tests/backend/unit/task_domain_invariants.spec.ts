import { test } from '@japa/runner'

import {
  DEFAULT_TASK_STATUSES,
  DEFAULT_WORKFLOW_TRANSITIONS,
  TaskStatusCategory,
  TERMINAL_STATUS_CATEGORIES,
} from '#modules/tasks/constants/task_constants'

test.group('Task domain invariants', () => {
  test('default task statuses and workflow transitions preserve core graph', ({ assert }) => {
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

    const edges = DEFAULT_WORKFLOW_TRANSITIONS.map(
      (transition) => `${transition.from_slug}->${transition.to_slug}`
    )

    assert.include(edges, 'todo->in_progress')
    assert.include(edges, 'in_progress->done_dev')
    assert.include(edges, 'in_testing->done')
    assert.include(edges, 'cancelled->todo')
    assert.deepEqual(
      [...TERMINAL_STATUS_CATEGORIES].sort(),
      [TaskStatusCategory.CANCELLED, TaskStatusCategory.DONE].sort()
    )
  })
})
