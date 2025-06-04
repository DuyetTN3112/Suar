import { test } from '@japa/runner'
import UpdateTaskStatusDTO from '#actions/tasks/dtos/update_task_status_dto'
import { TaskStatus } from '#constants/task_constants'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

// ============================================================================
// UpdateTaskStatusDTO - Construction
// ============================================================================
test.group('UpdateTaskStatusDTO | Construction', () => {
  test('creates with valid status', ({ assert }) => {
    const dto = new UpdateTaskStatusDTO({ task_id: VALID_UUID, status: TaskStatus.TODO })
    assert.equal(dto.task_id, VALID_UUID)
    assert.equal(dto.status, TaskStatus.TODO)
  })

  test('creates with reason', ({ assert }) => {
    const dto = new UpdateTaskStatusDTO({
      task_id: VALID_UUID,
      status: TaskStatus.IN_PROGRESS,
      reason: 'Started work',
    })
    assert.equal(dto.reason, 'Started work')
  })

  test('trims reason', ({ assert }) => {
    const dto = new UpdateTaskStatusDTO({
      task_id: VALID_UUID,
      status: TaskStatus.TODO,
      reason: '  trimmed  ',
    })
    assert.equal(dto.reason, 'trimmed')
  })

  test('throws for missing task_id', ({ assert }) => {
    assert.throws(() => new UpdateTaskStatusDTO({ task_id: '', status: TaskStatus.TODO }))
  })

  test('throws for missing status', ({ assert }) => {
    assert.throws(() => new UpdateTaskStatusDTO({ task_id: VALID_UUID, status: '' }))
  })

  test('throws for invalid status', ({ assert }) => {
    assert.throws(() => new UpdateTaskStatusDTO({ task_id: VALID_UUID, status: 'invalid' }))
  })

  test('throws for empty reason', ({ assert }) => {
    assert.throws(
      () => new UpdateTaskStatusDTO({ task_id: VALID_UUID, status: TaskStatus.TODO, reason: '   ' })
    )
  })

  test('throws for reason > 500 chars', ({ assert }) => {
    assert.throws(
      () =>
        new UpdateTaskStatusDTO({
          task_id: VALID_UUID,
          status: TaskStatus.TODO,
          reason: 'R'.repeat(501),
        })
    )
  })

  test('accepts all valid task statuses', ({ assert }) => {
    for (const status of Object.values(TaskStatus)) {
      const dto = new UpdateTaskStatusDTO({ task_id: VALID_UUID, status })
      assert.equal(dto.status, status)
    }
  })
})

// ============================================================================
// UpdateTaskStatusDTO - Business Logic
// ============================================================================
test.group('UpdateTaskStatusDTO | Business Logic', () => {
  test('hasReason returns true when reason exists', ({ assert }) => {
    const dto = new UpdateTaskStatusDTO({
      task_id: VALID_UUID,
      status: TaskStatus.TODO,
      reason: 'Because',
    })
    assert.isTrue(dto.hasReason())
  })

  test('hasReason returns false when no reason', ({ assert }) => {
    const dto = new UpdateTaskStatusDTO({ task_id: VALID_UUID, status: TaskStatus.TODO })
    assert.isFalse(dto.hasReason())
  })

  test('getAuditMessage includes status', ({ assert }) => {
    const dto = new UpdateTaskStatusDTO({ task_id: VALID_UUID, status: TaskStatus.IN_PROGRESS })
    assert.include(dto.getAuditMessage(), TaskStatus.IN_PROGRESS)
  })

  test('getAuditMessage includes reason when present', ({ assert }) => {
    const dto = new UpdateTaskStatusDTO({
      task_id: VALID_UUID,
      status: TaskStatus.TODO,
      reason: 'testing reason',
    })
    assert.include(dto.getAuditMessage(), 'testing reason')
  })

  test('getAuditMessage without reason has no colon', ({ assert }) => {
    const dto = new UpdateTaskStatusDTO({ task_id: VALID_UUID, status: TaskStatus.TODO })
    const msg = dto.getAuditMessage()
    assert.include(msg, TaskStatus.TODO)
    assert.notInclude(msg, ':')
  })

  test('validateTransition allows any when no rules', ({ assert }) => {
    const dto = new UpdateTaskStatusDTO({ task_id: VALID_UUID, status: TaskStatus.DONE })
    assert.isTrue(dto.validateTransition(TaskStatus.TODO))
  })

  test('validateTransition allows same status', ({ assert }) => {
    const dto = new UpdateTaskStatusDTO({ task_id: VALID_UUID, status: TaskStatus.TODO })
    const rules = new Map<string, string[]>()
    assert.isTrue(dto.validateTransition(TaskStatus.TODO, rules))
  })

  test('validateTransition enforces rules', ({ assert }) => {
    const rules = new Map<string, string[]>([[TaskStatus.TODO, [TaskStatus.IN_PROGRESS]]])
    const dto = new UpdateTaskStatusDTO({ task_id: VALID_UUID, status: TaskStatus.DONE })
    assert.isFalse(dto.validateTransition(TaskStatus.TODO, rules))
  })

  test('validateTransition allows valid transition in rules', ({ assert }) => {
    const rules = new Map<string, string[]>([[TaskStatus.TODO, [TaskStatus.IN_PROGRESS]]])
    const dto = new UpdateTaskStatusDTO({ task_id: VALID_UUID, status: TaskStatus.IN_PROGRESS })
    assert.isTrue(dto.validateTransition(TaskStatus.TODO, rules))
  })

  test('validateTransition allows when current status has no rules', ({ assert }) => {
    const rules = new Map<string, string[]>([[TaskStatus.TODO, [TaskStatus.IN_PROGRESS]]])
    const dto = new UpdateTaskStatusDTO({ task_id: VALID_UUID, status: TaskStatus.TODO })
    assert.isTrue(dto.validateTransition(TaskStatus.IN_PROGRESS, rules))
  })
})

// ============================================================================
// UpdateTaskStatusDTO - Notifications & Serialization
// ============================================================================
test.group('UpdateTaskStatusDTO | Notifications', () => {
  test('getNotificationMessage includes task title and updater', ({ assert }) => {
    const dto = new UpdateTaskStatusDTO({ task_id: VALID_UUID, status: TaskStatus.DONE })
    const msg = dto.getNotificationMessage('My Task', 'Alice')
    assert.include(msg, 'My Task')
    assert.include(msg, 'Alice')
  })

  test('getNotificationMessage includes reason when present', ({ assert }) => {
    const dto = new UpdateTaskStatusDTO({
      task_id: VALID_UUID,
      status: TaskStatus.TODO,
      reason: 'Reopening',
    })
    const msg = dto.getNotificationMessage('Task X', 'Bob')
    assert.include(msg, 'Reopening')
  })

  test('toObject returns status only', ({ assert }) => {
    const dto = new UpdateTaskStatusDTO({
      task_id: VALID_UUID,
      status: TaskStatus.IN_PROGRESS,
      reason: 'testing',
    })
    const obj = dto.toObject()
    assert.deepEqual(obj, { status: TaskStatus.IN_PROGRESS })
  })
})
