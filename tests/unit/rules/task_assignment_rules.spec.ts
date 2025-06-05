import { test } from '@japa/runner'
import {
  canApplyForTask,
  validateAssignee,
  canRevokeAssignment,
  validateBatchStatusUpdate,
  validateTaskCreationFields,
  canProcessApplication,
} from '#domain/tasks/task_assignment_rules'
import {
  TaskVisibility,
  TaskStatus,
  TaskLabel,
  TaskPriority,
  AssignmentStatus,
} from '#constants/task_constants'

/**
 * Tests for task assignment rules.
 * All pure functions — no database required.
 */

// ============================================================================
// canApplyForTask
// ============================================================================

test.group('canApplyForTask', () => {
  test('allowed for external task, different user, no prior application', ({ assert }) => {
    const result = canApplyForTask({
      actorId: 'user-001',
      taskCreatorId: 'user-002',
      taskVisibility: TaskVisibility.EXTERNAL,
      hasExistingApplication: false,
    })
    assert.isTrue(result.allowed)
  })

  test('allowed for all-visibility task', ({ assert }) => {
    const result = canApplyForTask({
      actorId: 'user-001',
      taskCreatorId: 'user-002',
      taskVisibility: TaskVisibility.ALL,
      hasExistingApplication: false,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: cannot apply to own task', ({ assert }) => {
    const result = canApplyForTask({
      actorId: 'user-001',
      taskCreatorId: 'user-001',
      taskVisibility: TaskVisibility.EXTERNAL,
      hasExistingApplication: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      assert.equal(result.code, 'BUSINESS_RULE')
    }
  })

  test('denied: internal task not open for applications', ({ assert }) => {
    const result = canApplyForTask({
      actorId: 'user-001',
      taskCreatorId: 'user-002',
      taskVisibility: TaskVisibility.INTERNAL,
      hasExistingApplication: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      assert.equal(result.code, 'BUSINESS_RULE')
    }
  })

  test('denied: already applied', ({ assert }) => {
    const result = canApplyForTask({
      actorId: 'user-001',
      taskCreatorId: 'user-002',
      taskVisibility: TaskVisibility.EXTERNAL,
      hasExistingApplication: true,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      assert.equal(result.code, 'BUSINESS_RULE')
    }
  })

  test('checks own-task before visibility (first rule wins)', ({ assert }) => {
    const result = canApplyForTask({
      actorId: 'user-001',
      taskCreatorId: 'user-001',
      taskVisibility: TaskVisibility.INTERNAL,
      hasExistingApplication: true,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      // The own-task rule should fire first
      assert.include(result.reason, 'chính mình')
    }
  })
})

// ============================================================================
// validateAssignee
// ============================================================================

test.group('validateAssignee', () => {
  test('org member can be assigned to any task', ({ assert }) => {
    const result = validateAssignee({
      isOrgMember: true,
      isFreelancer: false,
      taskVisibility: TaskVisibility.INTERNAL,
    })
    assert.isTrue(result.allowed)
  })

  test('org member can be assigned even to external task', ({ assert }) => {
    const result = validateAssignee({
      isOrgMember: true,
      isFreelancer: false,
      taskVisibility: TaskVisibility.EXTERNAL,
    })
    assert.isTrue(result.allowed)
  })

  test('freelancer can be assigned to external task', ({ assert }) => {
    const result = validateAssignee({
      isOrgMember: false,
      isFreelancer: true,
      taskVisibility: TaskVisibility.EXTERNAL,
    })
    assert.isTrue(result.allowed)
  })

  test('freelancer can be assigned to all-visibility task', ({ assert }) => {
    const result = validateAssignee({
      isOrgMember: false,
      isFreelancer: true,
      taskVisibility: TaskVisibility.ALL,
    })
    assert.isTrue(result.allowed)
  })

  test('freelancer cannot be assigned to internal task', ({ assert }) => {
    const result = validateAssignee({
      isOrgMember: false,
      isFreelancer: true,
      taskVisibility: TaskVisibility.INTERNAL,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      assert.equal(result.code, 'BUSINESS_RULE')
    }
  })

  test('non-member non-freelancer is denied', ({ assert }) => {
    const result = validateAssignee({
      isOrgMember: false,
      isFreelancer: false,
      taskVisibility: TaskVisibility.EXTERNAL,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      assert.equal(result.code, 'BUSINESS_RULE')
    }
  })

  test('org member who is also freelancer — org membership takes priority', ({ assert }) => {
    const result = validateAssignee({
      isOrgMember: true,
      isFreelancer: true,
      taskVisibility: TaskVisibility.INTERNAL,
    })
    assert.isTrue(result.allowed)
  })
})

// ============================================================================
// canRevokeAssignment
// ============================================================================

test.group('canRevokeAssignment', () => {
  test('allowed: active assignment with reason', ({ assert }) => {
    const result = canRevokeAssignment({
      assignmentStatus: AssignmentStatus.ACTIVE,
      reason: 'Performance issues',
    })
    assert.isTrue(result.allowed)
  })

  test('denied: assignment not active (completed)', ({ assert }) => {
    const result = canRevokeAssignment({
      assignmentStatus: AssignmentStatus.COMPLETED,
      reason: 'Some reason',
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: assignment not active (cancelled)', ({ assert }) => {
    const result = canRevokeAssignment({
      assignmentStatus: AssignmentStatus.CANCELLED,
      reason: 'Some reason',
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: no reason provided (null)', ({ assert }) => {
    const result = canRevokeAssignment({
      assignmentStatus: AssignmentStatus.ACTIVE,
      reason: null,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: empty reason', ({ assert }) => {
    const result = canRevokeAssignment({
      assignmentStatus: AssignmentStatus.ACTIVE,
      reason: '',
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: whitespace-only reason', ({ assert }) => {
    const result = canRevokeAssignment({
      assignmentStatus: AssignmentStatus.ACTIVE,
      reason: '   ',
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('priority: status check fires before reason check', ({ assert }) => {
    const result = canRevokeAssignment({
      assignmentStatus: AssignmentStatus.COMPLETED,
      reason: null,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      assert.include(result.reason, 'active')
    }
  })
})

// ============================================================================
// validateBatchStatusUpdate
// ============================================================================

test.group('validateBatchStatusUpdate', () => {
  test('valid batch with 1 task', ({ assert }) => {
    const result = validateBatchStatusUpdate({
      taskCount: 1,
      newStatus: TaskStatus.IN_PROGRESS,
      maxBatchSize: 50,
    })
    assert.isTrue(result.allowed)
  })

  test('valid batch at max size', ({ assert }) => {
    const result = validateBatchStatusUpdate({
      taskCount: 50,
      newStatus: TaskStatus.DONE,
      maxBatchSize: 50,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: empty batch (0 tasks)', ({ assert }) => {
    const result = validateBatchStatusUpdate({
      taskCount: 0,
      newStatus: TaskStatus.IN_PROGRESS,
      maxBatchSize: 50,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: exceeds max batch size', ({ assert }) => {
    const result = validateBatchStatusUpdate({
      taskCount: 51,
      newStatus: TaskStatus.IN_PROGRESS,
      maxBatchSize: 50,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      assert.equal(result.code, 'BUSINESS_RULE')
      assert.include(result.reason, '50')
    }
  })

  test('denied: invalid status', ({ assert }) => {
    const result = validateBatchStatusUpdate({
      taskCount: 5,
      newStatus: 'invalid_status',
      maxBatchSize: 50,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('all valid statuses accepted', ({ assert }) => {
    const statuses = Object.values(TaskStatus)
    for (const status of statuses) {
      const result = validateBatchStatusUpdate({
        taskCount: 1,
        newStatus: status,
        maxBatchSize: 50,
      })
      assert.isTrue(result.allowed, `Status "${status}" should be valid`)
    }
  })
})

// ============================================================================
// validateTaskCreationFields
// ============================================================================

test.group('validateTaskCreationFields', () => {
  test('all null fields is valid', ({ assert }) => {
    const result = validateTaskCreationFields({
      status: null,
      label: null,
      priority: null,
      isDueDateInPast: false,
    })
    assert.isTrue(result.allowed)
  })

  test('valid status accepted', ({ assert }) => {
    const result = validateTaskCreationFields({
      status: TaskStatus.TODO,
      label: null,
      priority: null,
      isDueDateInPast: false,
    })
    assert.isTrue(result.allowed)
  })

  test('valid label accepted', ({ assert }) => {
    const result = validateTaskCreationFields({
      status: null,
      label: TaskLabel.BUG,
      priority: null,
      isDueDateInPast: false,
    })
    assert.isTrue(result.allowed)
  })

  test('valid priority accepted', ({ assert }) => {
    const result = validateTaskCreationFields({
      status: null,
      label: null,
      priority: TaskPriority.HIGH,
      isDueDateInPast: false,
    })
    assert.isTrue(result.allowed)
  })

  test('denied: invalid status', ({ assert }) => {
    const result = validateTaskCreationFields({
      status: 'nonexistent_status',
      label: null,
      priority: null,
      isDueDateInPast: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: invalid label', ({ assert }) => {
    const result = validateTaskCreationFields({
      status: null,
      label: 'nonexistent_label',
      priority: null,
      isDueDateInPast: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: invalid priority', ({ assert }) => {
    const result = validateTaskCreationFields({
      status: null,
      label: null,
      priority: 'nonexistent_priority',
      isDueDateInPast: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('denied: due date in past', ({ assert }) => {
    const result = validateTaskCreationFields({
      status: null,
      label: null,
      priority: null,
      isDueDateInPast: true,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'BUSINESS_RULE')
  })

  test('priority: status check fires before label check', ({ assert }) => {
    const result = validateTaskCreationFields({
      status: 'bad_status',
      label: 'bad_label',
      priority: null,
      isDueDateInPast: false,
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) {
      assert.include(result.reason, 'Trạng thái')
    }
  })
})

// ============================================================================
// canProcessApplication
// ============================================================================

test.group('canProcessApplication', () => {
  test('task creator can process application', ({ assert }) => {
    const result = canProcessApplication({
      actorId: 'user-001',
      taskCreatorId: 'user-001',
    })
    assert.isTrue(result.allowed)
  })

  test('denied: non-creator cannot process', ({ assert }) => {
    const result = canProcessApplication({
      actorId: 'user-001',
      taskCreatorId: 'user-002',
    })
    assert.isFalse(result.allowed)
    if (!result.allowed) assert.equal(result.code, 'FORBIDDEN')
  })
})
