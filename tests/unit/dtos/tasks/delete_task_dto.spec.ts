import { test } from '@japa/runner'
import DeleteTaskDTO from '#actions/tasks/dtos/delete_task_dto'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

// ============================================================================
// DeleteTaskDTO - Construction
// ============================================================================
test.group('DeleteTaskDTO | Construction', () => {
  test('creates with task_id only (soft delete)', ({ assert }) => {
    const dto = new DeleteTaskDTO({ task_id: VALID_UUID })
    assert.equal(dto.task_id, VALID_UUID)
    assert.isFalse(dto.permanent)
    assert.isUndefined(dto.reason)
  })

  test('creates with permanent flag', ({ assert }) => {
    const dto = new DeleteTaskDTO({ task_id: VALID_UUID, permanent: true })
    assert.isTrue(dto.permanent)
  })

  test('creates with reason', ({ assert }) => {
    const dto = new DeleteTaskDTO({ task_id: VALID_UUID, reason: 'Duplicate task' })
    assert.equal(dto.reason, 'Duplicate task')
  })

  test('trims reason', ({ assert }) => {
    const dto = new DeleteTaskDTO({ task_id: VALID_UUID, reason: '  Reason  ' })
    assert.equal(dto.reason, 'Reason')
  })

  test('throws for missing task_id', ({ assert }) => {
    assert.throws(() => new DeleteTaskDTO({ task_id: '' }))
  })

  test('throws for empty reason', ({ assert }) => {
    assert.throws(() => new DeleteTaskDTO({ task_id: VALID_UUID, reason: '   ' }))
  })

  test('throws for reason > 500 chars', ({ assert }) => {
    assert.throws(() => new DeleteTaskDTO({ task_id: VALID_UUID, reason: 'R'.repeat(501) }))
  })
})

// ============================================================================
// DeleteTaskDTO - Business Logic
// ============================================================================
test.group('DeleteTaskDTO | Business Logic', () => {
  test('hasReason returns true when reason provided', ({ assert }) => {
    const dto = new DeleteTaskDTO({ task_id: VALID_UUID, reason: 'Obsolete' })
    assert.isTrue(dto.hasReason())
  })

  test('hasReason returns false when no reason', ({ assert }) => {
    const dto = new DeleteTaskDTO({ task_id: VALID_UUID })
    assert.isFalse(dto.hasReason())
  })

  test('isPermanentDelete returns deletion type', ({ assert }) => {
    assert.isTrue(new DeleteTaskDTO({ task_id: VALID_UUID, permanent: true }).isPermanentDelete())
    assert.isFalse(new DeleteTaskDTO({ task_id: VALID_UUID }).isPermanentDelete())
  })

  test('getDeleteType returns soft or hard', ({ assert }) => {
    assert.equal(new DeleteTaskDTO({ task_id: VALID_UUID }).getDeleteType(), 'soft')
    assert.equal(
      new DeleteTaskDTO({ task_id: VALID_UUID, permanent: true }).getDeleteType(),
      'hard'
    )
  })

  test('getAuditMessage for soft delete', ({ assert }) => {
    const dto = new DeleteTaskDTO({ task_id: VALID_UUID })
    assert.include(dto.getAuditMessage(), 'soft delete')
  })

  test('getAuditMessage for permanent delete', ({ assert }) => {
    const dto = new DeleteTaskDTO({ task_id: VALID_UUID, permanent: true })
    assert.include(dto.getAuditMessage(), 'vĩnh viễn')
  })

  test('getAuditMessage includes reason', ({ assert }) => {
    const dto = new DeleteTaskDTO({ task_id: VALID_UUID, reason: 'Duplicate' })
    assert.include(dto.getAuditMessage(), 'Duplicate')
  })

  test('toObject contains all fields', ({ assert }) => {
    const dto = new DeleteTaskDTO({ task_id: VALID_UUID, reason: 'Test', permanent: true })
    const obj = dto.toObject()
    assert.equal(obj.task_id, VALID_UUID)
    assert.equal(obj.reason, 'Test')
    assert.isTrue(obj.permanent)
    assert.equal(obj.delete_type, 'hard')
  })

  test('toObject nullifies missing reason', ({ assert }) => {
    const dto = new DeleteTaskDTO({ task_id: VALID_UUID })
    assert.isNull(dto.toObject().reason)
  })
})
