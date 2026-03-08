import { test } from '@japa/runner'
import {
  validateTransition,
  isTerminalStatus,
  getAllowedTransitions,
} from '#actions/tasks/rules/task_state_machine'
import { TaskStatus } from '#constants/task_constants'

/**
 * Tests for task state machine.
 * All pure functions — no database required.
 */

// ============================================================================
// validateTransition
// ============================================================================

test.group('validateTransition | allowed transitions', () => {
  test('todo → in_progress (with assignee)', ({ assert }) => {
    const result = validateTransition({
      currentStatus: TaskStatus.TODO,
      newStatus: TaskStatus.IN_PROGRESS,
      isAssigned: true,
    })
    assert.isTrue(result.allowed)
  })

  test('todo → cancelled', ({ assert }) => {
    const result = validateTransition({
      currentStatus: TaskStatus.TODO,
      newStatus: TaskStatus.CANCELLED,
      isAssigned: false,
    })
    assert.isTrue(result.allowed)
  })

  test('in_progress → todo', ({ assert }) => {
    const result = validateTransition({
      currentStatus: TaskStatus.IN_PROGRESS,
      newStatus: TaskStatus.TODO,
      isAssigned: true,
    })
    assert.isTrue(result.allowed)
  })

  test('in_progress → in_review', ({ assert }) => {
    const result = validateTransition({
      currentStatus: TaskStatus.IN_PROGRESS,
      newStatus: TaskStatus.IN_REVIEW,
      isAssigned: true,
    })
    assert.isTrue(result.allowed)
  })

  test('in_progress → cancelled', ({ assert }) => {
    const result = validateTransition({
      currentStatus: TaskStatus.IN_PROGRESS,
      newStatus: TaskStatus.CANCELLED,
      isAssigned: true,
    })
    assert.isTrue(result.allowed)
  })

  test('in_review → in_progress', ({ assert }) => {
    const result = validateTransition({
      currentStatus: TaskStatus.IN_REVIEW,
      newStatus: TaskStatus.IN_PROGRESS,
      isAssigned: true,
    })
    assert.isTrue(result.allowed)
  })

  test('in_review → done', ({ assert }) => {
    const result = validateTransition({
      currentStatus: TaskStatus.IN_REVIEW,
      newStatus: TaskStatus.DONE,
      isAssigned: true,
    })
    assert.isTrue(result.allowed)
  })

  test('in_review → cancelled', ({ assert }) => {
    const result = validateTransition({
      currentStatus: TaskStatus.IN_REVIEW,
      newStatus: TaskStatus.CANCELLED,
      isAssigned: true,
    })
    assert.isTrue(result.allowed)
  })

  test('cancelled → todo (reopen)', ({ assert }) => {
    const result = validateTransition({
      currentStatus: TaskStatus.CANCELLED,
      newStatus: TaskStatus.TODO,
      isAssigned: false,
    })
    assert.isTrue(result.allowed)
  })

  test('same status is always allowed (no-op)', ({ assert }) => {
    const result = validateTransition({
      currentStatus: TaskStatus.IN_PROGRESS,
      newStatus: TaskStatus.IN_PROGRESS,
      isAssigned: true,
    })
    assert.isTrue(result.allowed)
  })
})

test.group('validateTransition | denied transitions', () => {
  test('todo → done (skip review)', ({ assert }) => {
    const result = validateTransition({
      currentStatus: TaskStatus.TODO,
      newStatus: TaskStatus.DONE,
      isAssigned: true,
    })
    assert.isFalse(result.allowed)
  })

  test('todo → in_review (skip in_progress)', ({ assert }) => {
    const result = validateTransition({
      currentStatus: TaskStatus.TODO,
      newStatus: TaskStatus.IN_REVIEW,
      isAssigned: true,
    })
    assert.isFalse(result.allowed)
  })

  test('done → anything (terminal state)', ({ assert }) => {
    for (const status of [
      TaskStatus.TODO,
      TaskStatus.IN_PROGRESS,
      TaskStatus.IN_REVIEW,
      TaskStatus.CANCELLED,
    ]) {
      const result = validateTransition({
        currentStatus: TaskStatus.DONE,
        newStatus: status,
        isAssigned: true,
      })
      assert.isFalse(result.allowed, `done → ${status} should be denied`)
    }
  })

  test('cancelled → in_progress (must go through todo)', ({ assert }) => {
    const result = validateTransition({
      currentStatus: TaskStatus.CANCELLED,
      newStatus: TaskStatus.IN_PROGRESS,
      isAssigned: true,
    })
    assert.isFalse(result.allowed)
  })

  test('in_review → todo (must go back to in_progress)', ({ assert }) => {
    const result = validateTransition({
      currentStatus: TaskStatus.IN_REVIEW,
      newStatus: TaskStatus.TODO,
      isAssigned: true,
    })
    assert.isFalse(result.allowed)
  })
})

test.group('validateTransition | business rules', () => {
  test('todo → in_progress without assignee is denied', ({ assert }) => {
    const result = validateTransition({
      currentStatus: TaskStatus.TODO,
      newStatus: TaskStatus.IN_PROGRESS,
      isAssigned: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      assert.equal(result.code, 'BUSINESS_RULE')
    }
  })

  test('unknown current status returns INVALID_STATE', ({ assert }) => {
    const result = validateTransition({
      currentStatus: 'nonexistent_status',
      newStatus: TaskStatus.TODO,
      isAssigned: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      assert.equal(result.code, 'INVALID_STATE')
    }
  })

  test('denied transition returns INVALID_STATE code', ({ assert }) => {
    const result = validateTransition({
      currentStatus: TaskStatus.TODO,
      newStatus: TaskStatus.DONE,
      isAssigned: true,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      assert.equal(result.code, 'INVALID_STATE')
    }
  })
})

// ============================================================================
// isTerminalStatus
// ============================================================================

test.group('isTerminalStatus', () => {
  test('done is terminal', ({ assert }) => {
    assert.isTrue(isTerminalStatus(TaskStatus.DONE))
  })

  test('cancelled is terminal', ({ assert }) => {
    assert.isTrue(isTerminalStatus(TaskStatus.CANCELLED))
  })

  test('todo is not terminal', ({ assert }) => {
    assert.isFalse(isTerminalStatus(TaskStatus.TODO))
  })

  test('in_progress is not terminal', ({ assert }) => {
    assert.isFalse(isTerminalStatus(TaskStatus.IN_PROGRESS))
  })

  test('in_review is not terminal', ({ assert }) => {
    assert.isFalse(isTerminalStatus(TaskStatus.IN_REVIEW))
  })
})

// ============================================================================
// getAllowedTransitions
// ============================================================================

test.group('getAllowedTransitions', () => {
  test('todo can go to in_progress or cancelled', ({ assert }) => {
    const transitions = getAllowedTransitions(TaskStatus.TODO)
    assert.deepEqual([...transitions], [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED])
  })

  test('in_progress can go to todo, in_review, or cancelled', ({ assert }) => {
    const transitions = getAllowedTransitions(TaskStatus.IN_PROGRESS)
    assert.deepEqual(
      [...transitions],
      [TaskStatus.TODO, TaskStatus.IN_REVIEW, TaskStatus.CANCELLED]
    )
  })

  test('in_review can go to in_progress, done, or cancelled', ({ assert }) => {
    const transitions = getAllowedTransitions(TaskStatus.IN_REVIEW)
    assert.deepEqual(
      [...transitions],
      [TaskStatus.IN_PROGRESS, TaskStatus.DONE, TaskStatus.CANCELLED]
    )
  })

  test('done has no allowed transitions', ({ assert }) => {
    const transitions = getAllowedTransitions(TaskStatus.DONE)
    assert.deepEqual([...transitions], [])
  })

  test('cancelled can go back to todo', ({ assert }) => {
    const transitions = getAllowedTransitions(TaskStatus.CANCELLED)
    assert.deepEqual([...transitions], [TaskStatus.TODO])
  })

  test('unknown status returns empty array', ({ assert }) => {
    const transitions = getAllowedTransitions('fantasy_status')
    assert.deepEqual([...transitions], [])
  })
})
