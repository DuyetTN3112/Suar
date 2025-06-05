import { test } from '@japa/runner'
import UpdateTaskTimeDTO from '#actions/tasks/dtos/request/update_task_time_dto'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

// ============================================================================
// UpdateTaskTimeDTO - Construction
// ============================================================================
test.group('UpdateTaskTimeDTO | Construction', () => {
  test('creates with estimated_time only', ({ assert }) => {
    const dto = new UpdateTaskTimeDTO({ task_id: VALID_UUID, estimated_time: 8 })
    assert.equal(dto.estimated_time, 8)
    assert.isUndefined(dto.actual_time)
  })

  test('creates with actual_time only', ({ assert }) => {
    const dto = new UpdateTaskTimeDTO({ task_id: VALID_UUID, actual_time: 5 })
    assert.isUndefined(dto.estimated_time)
    assert.equal(dto.actual_time, 5)
  })

  test('creates with both times', ({ assert }) => {
    const dto = new UpdateTaskTimeDTO({ task_id: VALID_UUID, estimated_time: 10, actual_time: 12 })
    assert.equal(dto.estimated_time, 10)
    assert.equal(dto.actual_time, 12)
  })

  test('accepts zero values', ({ assert }) => {
    const dto = new UpdateTaskTimeDTO({ task_id: VALID_UUID, estimated_time: 0 })
    assert.equal(dto.estimated_time, 0)
  })

  test('throws for missing task_id', ({ assert }) => {
    assert.throws(() => new UpdateTaskTimeDTO({ task_id: '', estimated_time: 5 }))
  })

  test('throws when neither time is provided', ({ assert }) => {
    assert.throws(() => new UpdateTaskTimeDTO({ task_id: VALID_UUID }))
  })

  test('throws for negative estimated_time', ({ assert }) => {
    assert.throws(() => new UpdateTaskTimeDTO({ task_id: VALID_UUID, estimated_time: -1 }))
  })

  test('throws for negative actual_time', ({ assert }) => {
    assert.throws(() => new UpdateTaskTimeDTO({ task_id: VALID_UUID, actual_time: -1 }))
  })

  test('throws for estimated_time > 999', ({ assert }) => {
    assert.throws(() => new UpdateTaskTimeDTO({ task_id: VALID_UUID, estimated_time: 1000 }))
  })

  test('throws for actual_time > 999', ({ assert }) => {
    assert.throws(() => new UpdateTaskTimeDTO({ task_id: VALID_UUID, actual_time: 1000 }))
  })
})

// ============================================================================
// UpdateTaskTimeDTO - Business Logic
// ============================================================================
test.group('UpdateTaskTimeDTO | Business Logic', () => {
  test('hasEstimatedTimeUpdate returns true when provided', ({ assert }) => {
    assert.isTrue(
      new UpdateTaskTimeDTO({ task_id: VALID_UUID, estimated_time: 8 }).hasEstimatedTimeUpdate()
    )
  })

  test('hasEstimatedTimeUpdate returns false when not provided', ({ assert }) => {
    assert.isFalse(
      new UpdateTaskTimeDTO({ task_id: VALID_UUID, actual_time: 5 }).hasEstimatedTimeUpdate()
    )
  })

  test('hasActualTimeUpdate returns true when provided', ({ assert }) => {
    assert.isTrue(
      new UpdateTaskTimeDTO({ task_id: VALID_UUID, actual_time: 5 }).hasActualTimeUpdate()
    )
  })

  test('hasActualTimeUpdate returns false when not provided', ({ assert }) => {
    assert.isFalse(
      new UpdateTaskTimeDTO({ task_id: VALID_UUID, estimated_time: 8 }).hasActualTimeUpdate()
    )
  })

  test('isOverEstimate returns true when actual > estimated', ({ assert }) => {
    assert.isTrue(
      new UpdateTaskTimeDTO({
        task_id: VALID_UUID,
        estimated_time: 8,
        actual_time: 10,
      }).isOverEstimate()
    )
  })

  test('isOverEstimate returns false when actual <= estimated', ({ assert }) => {
    assert.isFalse(
      new UpdateTaskTimeDTO({
        task_id: VALID_UUID,
        estimated_time: 8,
        actual_time: 6,
      }).isOverEstimate()
    )
  })

  test('isOverEstimate returns null when data is insufficient', ({ assert }) => {
    assert.isNull(
      new UpdateTaskTimeDTO({ task_id: VALID_UUID, estimated_time: 8 }).isOverEstimate()
    )
  })

  test('getCompletionPercentage calculates correctly', ({ assert }) => {
    assert.equal(
      new UpdateTaskTimeDTO({
        task_id: VALID_UUID,
        estimated_time: 10,
        actual_time: 12,
      }).getCompletionPercentage(),
      120
    )
  })

  test('getCompletionPercentage returns 50 for half time', ({ assert }) => {
    assert.equal(
      new UpdateTaskTimeDTO({
        task_id: VALID_UUID,
        estimated_time: 10,
        actual_time: 5,
      }).getCompletionPercentage(),
      50
    )
  })

  test('getCompletionPercentage returns null when data insufficient', ({ assert }) => {
    assert.isNull(
      new UpdateTaskTimeDTO({ task_id: VALID_UUID, estimated_time: 8 }).getCompletionPercentage()
    )
  })

  test('getCompletionPercentage returns null when estimated is 0', ({ assert }) => {
    assert.isNull(
      new UpdateTaskTimeDTO({
        task_id: VALID_UUID,
        estimated_time: 0,
        actual_time: 5,
      }).getCompletionPercentage()
    )
  })

  test('getPerformanceMessage returns fast for <= 80%', ({ assert }) => {
    const msg = new UpdateTaskTimeDTO({
      task_id: VALID_UUID,
      estimated_time: 10,
      actual_time: 7,
    }).getPerformanceMessage()
    assert.isNotNull(msg)
    assert.include(msg!, 'nhanh hơn')
  })

  test('getPerformanceMessage returns ok for <= 100%', ({ assert }) => {
    const msg = new UpdateTaskTimeDTO({
      task_id: VALID_UUID,
      estimated_time: 10,
      actual_time: 10,
    }).getPerformanceMessage()
    assert.isNotNull(msg)
    assert.include(msg!, 'đúng thời gian')
  })

  test('getPerformanceMessage returns warning for <= 120%', ({ assert }) => {
    const msg = new UpdateTaskTimeDTO({
      task_id: VALID_UUID,
      estimated_time: 10,
      actual_time: 11,
    }).getPerformanceMessage()
    assert.isNotNull(msg)
    assert.include(msg!, 'một chút')
  })

  test('getPerformanceMessage returns alert for > 120%', ({ assert }) => {
    const msg = new UpdateTaskTimeDTO({
      task_id: VALID_UUID,
      estimated_time: 10,
      actual_time: 15,
    }).getPerformanceMessage()
    assert.isNotNull(msg)
    assert.include(msg!, 'đáng kể')
  })

  test('getPerformanceMessage returns null when insufficient data', ({ assert }) => {
    assert.isNull(
      new UpdateTaskTimeDTO({ task_id: VALID_UUID, estimated_time: 8 }).getPerformanceMessage()
    )
  })
})

// ============================================================================
// UpdateTaskTimeDTO - Serialization & Audit
// ============================================================================
test.group('UpdateTaskTimeDTO | Serialization', () => {
  test('toObject includes only provided fields', ({ assert }) => {
    const dto = new UpdateTaskTimeDTO({ task_id: VALID_UUID, estimated_time: 8 })
    const obj = dto.toObject()
    assert.property(obj, 'estimated_time')
    assert.notProperty(obj, 'actual_time')
  })

  test('toObject includes both fields when both provided', ({ assert }) => {
    const dto = new UpdateTaskTimeDTO({ task_id: VALID_UUID, estimated_time: 8, actual_time: 6 })
    const obj = dto.toObject()
    assert.deepEqual(obj, { estimated_time: 8, actual_time: 6 })
  })

  test('getAuditMessage includes estimated time', ({ assert }) => {
    const dto = new UpdateTaskTimeDTO({ task_id: VALID_UUID, estimated_time: 8 })
    assert.include(dto.getAuditMessage(), '8h')
  })

  test('getAuditMessage includes both times', ({ assert }) => {
    const dto = new UpdateTaskTimeDTO({ task_id: VALID_UUID, estimated_time: 8, actual_time: 6 })
    const msg = dto.getAuditMessage()
    assert.include(msg, '8h')
    assert.include(msg, '6h')
  })
})
