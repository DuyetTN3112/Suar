import { test } from '@japa/runner'
import {
  validateTransition,
  isTerminalStatus,
  getAllowedTransitions,
} from '#domain/tasks/task_state_machine'

test.group('Task state machine', () => {
  test('legacy workflow keeps same-status updates as no-ops and only done or cancelled terminal', ({
    assert,
  }) => {
    assert.isTrue(
      validateTransition({
        currentStatus: 'todo',
        newStatus: 'todo',
        isAssigned: false,
      }).allowed
    )
    assert.isTrue(isTerminalStatus('done'))
    assert.isTrue(isTerminalStatus('cancelled'))
    assert.isFalse(isTerminalStatus('todo'))
    assert.isFalse(isTerminalStatus('in_review'))
    const denied = validateTransition({
      currentStatus: 'todo',
      newStatus: 'in_progress',
      isAssigned: false,
    })

    assert.isFalse(denied.allowed)
    if (!denied.allowed) {
      assert.equal(denied.code, 'BUSINESS_RULE')
      assert.include(denied.reason, 'giao')
    }
    assert.isTrue(
      validateTransition({
        currentStatus: 'todo',
        newStatus: 'in_progress',
        isAssigned: true,
      }).allowed
    )
    assert.isTrue(
      validateTransition({
        currentStatus: 'in_progress',
        newStatus: 'in_review',
        isAssigned: true,
      }).allowed
    )
    assert.isTrue(
      validateTransition({
        currentStatus: 'in_review',
        newStatus: 'done',
        isAssigned: true,
      }).allowed
    )
  })

  test('illegal jumps and unknown statuses surface INVALID_STATE with next-step hints', ({
    assert,
  }) => {
    const illegalJump = validateTransition({
      currentStatus: 'todo',
      newStatus: 'done',
      isAssigned: true,
    })
    const unknown = validateTransition({
      currentStatus: 'unknown',
      newStatus: 'done',
      isAssigned: true,
    })

    assert.isFalse(illegalJump.allowed)
    if (!illegalJump.allowed) {
      assert.equal(illegalJump.code, 'INVALID_STATE')
      assert.include(illegalJump.reason, 'in_progress')
      assert.include(illegalJump.reason, 'cancelled')
    }
    assert.isFalse(unknown.allowed)
    if (!unknown.allowed) {
      assert.equal(unknown.code, 'INVALID_STATE')
      assert.include(unknown.reason, 'unknown')
    }
    assert.deepEqual(getAllowedTransitions('unknown'), [])
  })

  test('cancelled tasks can reopen to todo while done stays locked down', ({ assert }) => {
    assert.isTrue(
      validateTransition({
        currentStatus: 'cancelled',
        newStatus: 'todo',
        isAssigned: false,
      }).allowed
    )
    assert.deepEqual(getAllowedTransitions('cancelled'), ['todo'])
    assert.deepEqual(getAllowedTransitions('done'), [])
  })
})
