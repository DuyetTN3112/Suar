import { test } from '@japa/runner'

import ValidationException from '#modules/errors/public_contracts/validation_exception'
import {
  buildBatchUpdateTaskStatusRequest,
  buildUpdateTaskSortOrderRequest,
} from '#modules/tasks/controllers/mappers/request/task-reading/task_board_request_mapper'

test.group('', () => {
  test('normalizes sort-order aliases and rejects invalid values at the boundary', ({ assert }) => {
    assert.deepEqual(
      buildUpdateTaskSortOrderRequest(
        { taskId: ' task-1 ' },
        { sort_order: '3', task_status_id: ' status-1 ' }
      ),
      { taskId: 'task-1', newSortOrder: 3, newTaskStatusId: 'status-1' }
    )

    for (const payload of [
      {},
      { sortOrder: Number.NaN },
      { sortOrder: -1 },
      { sortOrder: true },
      { sortOrder: '   ' },
      { sortOrder: 1, taskStatusId: 42 },
    ]) {
      assert.throws(
        () => buildUpdateTaskSortOrderRequest({ taskId: 'task-1' }, payload),
        ValidationException
      )
    }
  })

  test('rejects malformed sort-order route identifiers', ({ assert }) => {
    assert.throws(
      () => buildUpdateTaskSortOrderRequest({ taskId: '   ' }, { sortOrder: 1 }),
      ValidationException
    )
    assert.throws(
      () => buildUpdateTaskSortOrderRequest({ taskId: 42 }, { sortOrder: 1 }),
      ValidationException
    )
  })

  test('normalizes batch status aliases and rejects malformed collections', ({ assert }) => {
    assert.deepEqual(
      buildBatchUpdateTaskStatusRequest({
        task_ids: [' task-1 ', 'task-2'],
        task_status_id: ' status-done ',
      }),
      { taskIds: ['task-1', 'task-2'], newTaskStatusId: 'status-done' }
    )

    for (const payload of [
      {},
      { taskIds: [] },
      { taskIds: ['task-1', 2], taskStatusId: 'status-done' },
      { taskIds: ['task-1', '   '], taskStatusId: 'status-done' },
      { taskIds: ['task-1'], taskStatusId: '' },
      { taskIds: ['task-1'], taskStatusId: 42 },
    ]) {
      assert.throws(() => buildBatchUpdateTaskStatusRequest(payload), ValidationException)
    }
  })


})
