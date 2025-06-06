import { test } from '@japa/runner'
import UpdateTaskStatusDTO from '#actions/tasks/dtos/request/update_task_status_dto'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_STATUS_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

// ============================================================================
// UpdateTaskStatusDTO - Construction
// ============================================================================
test.group('UpdateTaskStatusDTO | Construction', () => {
  test('creates with valid task_status_id', ({ assert }) => {
    const dto = new UpdateTaskStatusDTO({ task_id: VALID_UUID, task_status_id: VALID_STATUS_ID })
    assert.equal(dto.task_id, VALID_UUID)
    assert.equal(dto.task_status_id, VALID_STATUS_ID)
  })

  test('creates with reason', ({ assert }) => {
    const dto = new UpdateTaskStatusDTO({
      task_id: VALID_UUID,
      task_status_id: VALID_STATUS_ID,
      reason: 'Started work',
    })
    assert.equal(dto.reason, 'Started work')
  })

  test('trims reason', ({ assert }) => {
    const dto = new UpdateTaskStatusDTO({
      task_id: VALID_UUID,
      task_status_id: VALID_STATUS_ID,
      reason: '  trimmed  ',
    })
    assert.equal(dto.reason, 'trimmed')
  })

  test('throws for missing task_id', ({ assert }) => {
    assert.throws(() => new UpdateTaskStatusDTO({ task_id: '', task_status_id: VALID_STATUS_ID }))
  })

  test('throws for missing task_status_id', ({ assert }) => {
    assert.throws(() => new UpdateTaskStatusDTO({ task_id: VALID_UUID, task_status_id: '' }))
  })

  test('throws for empty reason', ({ assert }) => {
    assert.throws(
      () =>
        new UpdateTaskStatusDTO({
          task_id: VALID_UUID,
          task_status_id: VALID_STATUS_ID,
          reason: '   ',
        })
    )
  })

  test('throws for reason > 500 chars', ({ assert }) => {
    assert.throws(
      () =>
        new UpdateTaskStatusDTO({
          task_id: VALID_UUID,
          task_status_id: VALID_STATUS_ID,
          reason: 'R'.repeat(501),
        })
    )
  })
})

// ============================================================================
// UpdateTaskStatusDTO - Business Logic
// ============================================================================
test.group('UpdateTaskStatusDTO | Business Logic', () => {
  test('hasReason returns true when reason exists', ({ assert }) => {
    const dto = new UpdateTaskStatusDTO({
      task_id: VALID_UUID,
      task_status_id: VALID_STATUS_ID,
      reason: 'Because',
    })
    assert.isTrue(dto.hasReason())
  })

  test('hasReason returns false when no reason', ({ assert }) => {
    const dto = new UpdateTaskStatusDTO({
      task_id: VALID_UUID,
      task_status_id: VALID_STATUS_ID,
    })
    assert.isFalse(dto.hasReason())
  })
})

// ============================================================================
// UpdateTaskStatusDTO - Notifications
// ============================================================================
test.group('UpdateTaskStatusDTO | Notifications', () => {
  test('getNotificationMessage includes task title and updater', ({ assert }) => {
    const dto = new UpdateTaskStatusDTO({
      task_id: VALID_UUID,
      task_status_id: VALID_STATUS_ID,
    })
    const msg = dto.getNotificationMessage('My Task', 'Alice')
    assert.include(msg, 'My Task')
    assert.include(msg, 'Alice')
  })

  test('getNotificationMessage includes reason when present', ({ assert }) => {
    const dto = new UpdateTaskStatusDTO({
      task_id: VALID_UUID,
      task_status_id: VALID_STATUS_ID,
      reason: 'Reopening',
    })
    const msg = dto.getNotificationMessage('Task X', 'Bob')
    assert.include(msg, 'Reopening')
  })
})
