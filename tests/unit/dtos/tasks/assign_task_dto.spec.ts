import { test } from '@japa/runner'
import AssignTaskDTO from '#actions/tasks/dtos/assign_task_dto'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const USER_UUID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

// ============================================================================
// AssignTaskDTO - Construction
// ============================================================================
test.group('AssignTaskDTO | Construction', () => {
  test('creates assign DTO', ({ assert }) => {
    const dto = new AssignTaskDTO({ task_id: VALID_UUID, assigned_to: USER_UUID })
    assert.equal(dto.task_id, VALID_UUID)
    assert.equal(dto.assigned_to, USER_UUID)
    assert.isTrue(dto.notify) // default
  })

  test('creates unassign DTO', ({ assert }) => {
    const dto = new AssignTaskDTO({ task_id: VALID_UUID, assigned_to: null })
    assert.isNull(dto.assigned_to)
  })

  test('creates with custom notify flag', ({ assert }) => {
    const dto = new AssignTaskDTO({ task_id: VALID_UUID, assigned_to: USER_UUID, notify: false })
    assert.isFalse(dto.notify)
  })

  test('creates with reason', ({ assert }) => {
    const dto = new AssignTaskDTO({ task_id: VALID_UUID, assigned_to: USER_UUID, reason: 'Expert' })
    assert.equal(dto.reason, 'Expert')
  })

  test('trims reason', ({ assert }) => {
    const dto = new AssignTaskDTO({
      task_id: VALID_UUID,
      assigned_to: USER_UUID,
      reason: '  Expert  ',
    })
    assert.equal(dto.reason, 'Expert')
  })

  test('throws for missing task_id', ({ assert }) => {
    assert.throws(() => new AssignTaskDTO({ task_id: '', assigned_to: USER_UUID }))
  })

  test('throws for empty reason', ({ assert }) => {
    assert.throws(
      () => new AssignTaskDTO({ task_id: VALID_UUID, assigned_to: USER_UUID, reason: '  ' })
    )
  })

  test('throws for reason > 500 chars', ({ assert }) => {
    assert.throws(
      () =>
        new AssignTaskDTO({
          task_id: VALID_UUID,
          assigned_to: USER_UUID,
          reason: 'R'.repeat(501),
        })
    )
  })
})

// ============================================================================
// AssignTaskDTO - Business Logic
// ============================================================================
test.group('AssignTaskDTO | Business Logic', () => {
  test('isAssigning returns true when assigned_to is set', ({ assert }) => {
    const dto = new AssignTaskDTO({ task_id: VALID_UUID, assigned_to: USER_UUID })
    assert.isTrue(dto.isAssigning())
    assert.isFalse(dto.isUnassigning())
  })

  test('isUnassigning returns true when assigned_to is null', ({ assert }) => {
    const dto = new AssignTaskDTO({ task_id: VALID_UUID, assigned_to: null })
    assert.isTrue(dto.isUnassigning())
    assert.isFalse(dto.isAssigning())
  })

  test('shouldNotify returns notify flag', ({ assert }) => {
    assert.isTrue(new AssignTaskDTO({ task_id: VALID_UUID, assigned_to: USER_UUID }).shouldNotify())
    assert.isFalse(
      new AssignTaskDTO({
        task_id: VALID_UUID,
        assigned_to: USER_UUID,
        notify: false,
      }).shouldNotify()
    )
  })

  test('hasReason detects reason presence', ({ assert }) => {
    assert.isTrue(
      new AssignTaskDTO({
        task_id: VALID_UUID,
        assigned_to: USER_UUID,
        reason: 'Expert',
      }).hasReason()
    )
    assert.isFalse(new AssignTaskDTO({ task_id: VALID_UUID, assigned_to: USER_UUID }).hasReason())
  })

  test('getAuditMessage for assign', ({ assert }) => {
    const dto = new AssignTaskDTO({ task_id: VALID_UUID, assigned_to: USER_UUID })
    assert.include(dto.getAuditMessage(), 'Giao task')
    assert.include(dto.getAuditMessage(), String(USER_UUID))
  })

  test('getAuditMessage for unassign', ({ assert }) => {
    const dto = new AssignTaskDTO({ task_id: VALID_UUID, assigned_to: null })
    assert.include(dto.getAuditMessage(), 'Bỏ giao việc')
  })

  test('getAuditMessage includes reason', ({ assert }) => {
    const dto = new AssignTaskDTO({
      task_id: VALID_UUID,
      assigned_to: USER_UUID,
      reason: 'More experienced',
    })
    assert.include(dto.getAuditMessage(), 'More experienced')
  })

  test('getNotificationMessage for assign', ({ assert }) => {
    const dto = new AssignTaskDTO({ task_id: VALID_UUID, assigned_to: USER_UUID })
    const msg = dto.getNotificationMessage('Fix bug', 'Admin')
    assert.include(msg, 'Admin')
    assert.include(msg, 'giao cho bạn')
    assert.include(msg, 'Fix bug')
  })

  test('getNotificationMessage for unassign', ({ assert }) => {
    const dto = new AssignTaskDTO({ task_id: VALID_UUID, assigned_to: null })
    const msg = dto.getNotificationMessage('Fix bug', 'Admin')
    assert.include(msg, 'bỏ giao')
    assert.include(msg, 'Fix bug')
  })

  test('getNotificationMessage includes reason', ({ assert }) => {
    const dto = new AssignTaskDTO({
      task_id: VALID_UUID,
      assigned_to: USER_UUID,
      reason: 'Reassignment',
    })
    const msg = dto.getNotificationMessage('Task X', 'Manager')
    assert.include(msg, 'Reassignment')
  })

  test('toObject contains assigned_to', ({ assert }) => {
    const dto = new AssignTaskDTO({ task_id: VALID_UUID, assigned_to: USER_UUID })
    assert.deepEqual(dto.toObject(), { assigned_to: USER_UUID })
  })

  test('toObject contains null for unassign', ({ assert }) => {
    const dto = new AssignTaskDTO({ task_id: VALID_UUID, assigned_to: null })
    assert.deepEqual(dto.toObject(), { assigned_to: null })
  })
})
