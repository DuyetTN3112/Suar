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

function assertDenied(
  assert: {
    isFalse(value: boolean): void
    equal(actual: unknown, expected: unknown): void
    include(haystack: string, needle: string): void
  },
  result: { allowed: boolean; code?: string; reason?: string },
  code: string,
  reasonPart?: string
): void {
  assert.isFalse(result.allowed)
  assert.equal(result.code, code)
  if (reasonPart && typeof result.reason === 'string') {
    assert.include(result.reason, reasonPart)
  }
}

test.group('Task assignment rules', () => {
  test('canApplyForTask allows open marketplace tasks and rejects self-application, closed windows, and duplicates', ({
    assert,
  }) => {
    assert.isTrue(
      canApplyForTask({
        actorId: 'user-001',
        taskCreatorId: 'user-002',
        taskVisibility: TaskVisibility.EXTERNAL,
        isTaskAlreadyAssigned: false,
        isApplicationDeadlinePassed: false,
        hasExistingApplication: false,
      }).allowed
    )
    assert.isTrue(
      canApplyForTask({
        actorId: 'user-001',
        taskCreatorId: 'user-002',
        taskVisibility: TaskVisibility.ALL,
        isTaskAlreadyAssigned: false,
        isApplicationDeadlinePassed: false,
        hasExistingApplication: false,
      }).allowed
    )

    assertDenied(
      assert,
      canApplyForTask({
        actorId: 'user-001',
        taskCreatorId: 'user-001',
        taskVisibility: TaskVisibility.INTERNAL,
        isTaskAlreadyAssigned: true,
        isApplicationDeadlinePassed: true,
        hasExistingApplication: true,
      }),
      'BUSINESS_RULE',
      'chính mình'
    )
    assertDenied(
      assert,
      canApplyForTask({
        actorId: 'user-001',
        taskCreatorId: 'user-002',
        taskVisibility: TaskVisibility.INTERNAL,
        isTaskAlreadyAssigned: false,
        isApplicationDeadlinePassed: false,
        hasExistingApplication: false,
      }),
      'BUSINESS_RULE'
    )
    assertDenied(
      assert,
      canApplyForTask({
        actorId: 'user-001',
        taskCreatorId: 'user-002',
        taskVisibility: TaskVisibility.EXTERNAL,
        isTaskAlreadyAssigned: true,
        isApplicationDeadlinePassed: false,
        hasExistingApplication: false,
      }),
      'BUSINESS_RULE',
      'được giao'
    )
    assertDenied(
      assert,
      canApplyForTask({
        actorId: 'user-001',
        taskCreatorId: 'user-002',
        taskVisibility: TaskVisibility.EXTERNAL,
        isTaskAlreadyAssigned: false,
        isApplicationDeadlinePassed: true,
        hasExistingApplication: false,
      }),
      'BUSINESS_RULE',
      'quá hạn'
    )
    assertDenied(
      assert,
      canApplyForTask({
        actorId: 'user-001',
        taskCreatorId: 'user-002',
        taskVisibility: TaskVisibility.EXTERNAL,
        isTaskAlreadyAssigned: false,
        isApplicationDeadlinePassed: false,
        hasExistingApplication: true,
      }),
      'BUSINESS_RULE'
    )
  })

  test('assignee validation and assignment revocation preserve marketplace boundaries and active-only rollback', ({
    assert,
  }) => {
    assert.isTrue(
      validateAssignee({
        isOrgMember: true,
        isFreelancer: false,
        taskVisibility: TaskVisibility.INTERNAL,
      }).allowed
    )
    assert.isTrue(
      validateAssignee({
        isOrgMember: false,
        isFreelancer: true,
        taskVisibility: TaskVisibility.EXTERNAL,
      }).allowed
    )
    assert.isTrue(
      validateAssignee({
        isOrgMember: false,
        isFreelancer: true,
        taskVisibility: TaskVisibility.ALL,
      }).allowed
    )

    assertDenied(
      assert,
      validateAssignee({
        isOrgMember: false,
        isFreelancer: true,
        taskVisibility: TaskVisibility.INTERNAL,
      }),
      'BUSINESS_RULE'
    )
    assertDenied(
      assert,
      validateAssignee({
        isOrgMember: false,
        isFreelancer: false,
        taskVisibility: TaskVisibility.EXTERNAL,
      }),
      'BUSINESS_RULE'
    )
    assert.isTrue(
      canRevokeAssignment({
        assignmentStatus: AssignmentStatus.ACTIVE,
        reason: 'Performance issues',
      }).allowed
    )
    assertDenied(
      assert,
      canRevokeAssignment({
        assignmentStatus: AssignmentStatus.COMPLETED,
        reason: null,
      }),
      'BUSINESS_RULE',
      'active'
    )
    assertDenied(
      assert,
      canRevokeAssignment({
        assignmentStatus: AssignmentStatus.ACTIVE,
        reason: '   ',
      }),
      'BUSINESS_RULE'
    )
  })

  test('batch status updates and task creation field validation reject structurally invalid workflow input', ({
    assert,
  }) => {
    assert.isTrue(
      validateBatchStatusUpdate({
        taskCount: 1,
        newStatusId: 'status-in-progress',
        maxBatchSize: 50,
      }).allowed
    )
    assertDenied(
      assert,
      validateBatchStatusUpdate({
        taskCount: 0,
        newStatusId: 'status-in-progress',
        maxBatchSize: 50,
      }),
      'BUSINESS_RULE'
    )
    assertDenied(
      assert,
      validateBatchStatusUpdate({
        taskCount: 51,
        newStatusId: 'status-in-progress',
        maxBatchSize: 50,
      }),
      'BUSINESS_RULE'
    )
    assertDenied(
      assert,
      validateBatchStatusUpdate({
        taskCount: 1,
        newStatusId: '   ',
        maxBatchSize: 50,
      }),
      'BUSINESS_RULE'
    )
    assert.isTrue(
      validateTaskCreationFields({
        status: TaskStatus.IN_PROGRESS,
        label: TaskLabel.FEATURE,
        priority: TaskPriority.HIGH,
        isDueDateInPast: false,
      }).allowed
    )
    assert.isTrue(
      validateTaskCreationFields({
        status: null,
        label: null,
        priority: null,
        isDueDateInPast: false,
      }).allowed
    )

    assertDenied(
      assert,
      validateTaskCreationFields({
        status: 'invalid_status',
        label: TaskLabel.FEATURE,
        priority: TaskPriority.HIGH,
        isDueDateInPast: false,
      }),
      'BUSINESS_RULE'
    )
    assertDenied(
      assert,
      validateTaskCreationFields({
        status: TaskStatus.IN_PROGRESS,
        label: 'invalid_label',
        priority: TaskPriority.HIGH,
        isDueDateInPast: false,
      }),
      'BUSINESS_RULE'
    )
    assertDenied(
      assert,
      validateTaskCreationFields({
        status: TaskStatus.IN_PROGRESS,
        label: TaskLabel.FEATURE,
        priority: 'invalid_priority',
        isDueDateInPast: false,
      }),
      'BUSINESS_RULE'
    )
    assertDenied(
      assert,
      validateTaskCreationFields({
        status: TaskStatus.IN_PROGRESS,
        label: TaskLabel.FEATURE,
        priority: TaskPriority.HIGH,
        isDueDateInPast: true,
      }),
      'BUSINESS_RULE'
    )
  })

  test('canProcessApplication only allows the task creator and blocks approving already assigned tasks', ({
    assert,
  }) => {
    assert.isTrue(
      canProcessApplication({
        actorId: 'user-001',
        taskCreatorId: 'user-001',
        action: 'approve',
        isTaskAlreadyAssigned: false,
      }).allowed
    )
    assert.isTrue(
      canProcessApplication({
        actorId: 'user-001',
        taskCreatorId: 'user-001',
        action: 'reject',
        isTaskAlreadyAssigned: true,
      }).allowed
    )
    assert.isFalse(
      canProcessApplication({
        actorId: 'user-002',
        taskCreatorId: 'user-001',
        action: 'approve',
        isTaskAlreadyAssigned: false,
      }).allowed
    )
    assertDenied(
      assert,
      canProcessApplication({
        actorId: 'user-001',
        taskCreatorId: 'user-001',
        action: 'approve',
        isTaskAlreadyAssigned: true,
      }),
      'BUSINESS_RULE',
      'không thể duyệt thêm'
    )
  })
})
