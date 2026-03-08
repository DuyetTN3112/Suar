import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import UpdateTaskDTO from '#actions/tasks/dtos/update_task_dto'
import { TaskStatus } from '#constants/task_constants'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'

// ============================================================================
// UpdateTaskDTO - Construction & Validation
// ============================================================================
test.group('UpdateTaskDTO | Construction', () => {
  test('creates with single field update', ({ assert }) => {
    const dto = new UpdateTaskDTO({ title: 'New Title' })
    assert.equal(dto.title, 'New Title')
  })

  test('creates with multiple field updates', ({ assert }) => {
    const dto = new UpdateTaskDTO({
      title: 'New',
      status: TaskStatus.IN_PROGRESS,
      priority: 'high',
    })
    assert.equal(dto.title, 'New')
    assert.equal(dto.status, TaskStatus.IN_PROGRESS)
    assert.equal(dto.priority, 'high')
  })

  test('creates with null assigned_to (unassign)', ({ assert }) => {
    const dto = new UpdateTaskDTO({ assigned_to: null })
    assert.isNull(dto.assigned_to)
  })

  test('creates with null label (remove label)', ({ assert }) => {
    const dto = new UpdateTaskDTO({ label: null })
    assert.isNull(dto.label)
  })

  test('creates with null due_date (remove due_date)', ({ assert }) => {
    const dto = new UpdateTaskDTO({ due_date: null })
    assert.isNull(dto.due_date)
  })

  test('parses due_date from ISO string', ({ assert }) => {
    const dto = new UpdateTaskDTO({ due_date: '2026-06-15T10:00:00.000Z' })
    assert.instanceOf(dto.due_date, DateTime)
    assert.equal(dto.due_date!.year, 2026)
  })

  test('throws for empty title', ({ assert }) => {
    assert.throws(() => new UpdateTaskDTO({ title: '' }))
  })

  test('throws for title < 3 chars', ({ assert }) => {
    assert.throws(() => new UpdateTaskDTO({ title: 'AB' }))
  })

  test('throws for title > 255 chars', ({ assert }) => {
    assert.throws(() => new UpdateTaskDTO({ title: 'A'.repeat(256) }))
  })

  test('throws for description > 5000 chars', ({ assert }) => {
    assert.throws(() => new UpdateTaskDTO({ description: 'D'.repeat(5001) }))
  })

  test('throws for invalid status', ({ assert }) => {
    assert.throws(() => new UpdateTaskDTO({ status: 'nonexistent' }))
  })

  test('throws for invalid label', ({ assert }) => {
    assert.throws(() => new UpdateTaskDTO({ label: 'nonexistent' }))
  })

  test('throws for invalid priority', ({ assert }) => {
    assert.throws(() => new UpdateTaskDTO({ priority: 'nonexistent' }))
  })

  test('throws for negative estimated_time', ({ assert }) => {
    assert.throws(() => new UpdateTaskDTO({ estimated_time: -1 }))
  })

  test('throws for negative actual_time', ({ assert }) => {
    assert.throws(() => new UpdateTaskDTO({ actual_time: -1 }))
  })

  test('throws for invalid due_date string', ({ assert }) => {
    assert.throws(() => new UpdateTaskDTO({ due_date: 'bad-date' }))
  })
})

// ============================================================================
// UpdateTaskDTO - Change Tracking
// ============================================================================
test.group('UpdateTaskDTO | Change Tracking', () => {
  test('hasUpdates returns true with field changes', ({ assert }) => {
    const dto = new UpdateTaskDTO({ title: 'New' })
    assert.isTrue(dto.hasUpdates())
  })

  test('hasUpdates returns false when only updated_by', ({ assert }) => {
    const dto = new UpdateTaskDTO({ updated_by: VALID_UUID })
    assert.isFalse(dto.hasUpdates())
  })

  test('getUpdatedFields excludes updated_by', ({ assert }) => {
    const dto = new UpdateTaskDTO({ title: 'New', updated_by: VALID_UUID })
    const fields = dto.getUpdatedFields()
    assert.include(fields, 'title')
    assert.notInclude(fields, 'updated_by')
  })

  test('getUpdatedFields returns all provided fields', ({ assert }) => {
    const dto = new UpdateTaskDTO({ title: 'Test', status: 'todo', priority: 'low' })
    const fields = dto.getUpdatedFields()
    assert.includeMembers(fields, ['title', 'status', 'priority'])
    assert.equal(fields.length, 3)
  })

  test('hasStatusChange detects status update', ({ assert }) => {
    assert.isTrue(new UpdateTaskDTO({ status: TaskStatus.DONE }).hasStatusChange())
    assert.isFalse(new UpdateTaskDTO({ title: 'Test' }).hasStatusChange())
  })

  test('hasAssigneeChange detects assignee update', ({ assert }) => {
    assert.isTrue(new UpdateTaskDTO({ assigned_to: VALID_UUID }).hasAssigneeChange())
    assert.isTrue(new UpdateTaskDTO({ assigned_to: null }).hasAssigneeChange())
    assert.isFalse(new UpdateTaskDTO({ title: 'Test' }).hasAssigneeChange())
  })

  test('hasDueDateChange detects due_date update', ({ assert }) => {
    assert.isTrue(new UpdateTaskDTO({ due_date: '2026-12-31' }).hasDueDateChange())
    assert.isTrue(new UpdateTaskDTO({ due_date: null }).hasDueDateChange())
    assert.isFalse(new UpdateTaskDTO({ title: 'Test' }).hasDueDateChange())
  })

  test('hasParentChange detects parent_task_id update', ({ assert }) => {
    assert.isTrue(new UpdateTaskDTO({ parent_task_id: VALID_UUID }).hasParentChange())
    assert.isTrue(new UpdateTaskDTO({ parent_task_id: null }).hasParentChange())
    assert.isFalse(new UpdateTaskDTO({ title: 'Test' }).hasParentChange())
  })

  test('hasProjectChange detects project_id update', ({ assert }) => {
    assert.isTrue(new UpdateTaskDTO({ project_id: VALID_UUID }).hasProjectChange())
    assert.isTrue(new UpdateTaskDTO({ project_id: null }).hasProjectChange())
    assert.isFalse(new UpdateTaskDTO({ title: 'Test' }).hasProjectChange())
  })

  test('hasTimeTrackingChange detects time updates', ({ assert }) => {
    assert.isTrue(new UpdateTaskDTO({ estimated_time: 5 }).hasTimeTrackingChange())
    assert.isTrue(new UpdateTaskDTO({ actual_time: 3 }).hasTimeTrackingChange())
    assert.isTrue(new UpdateTaskDTO({ estimated_time: 5, actual_time: 3 }).hasTimeTrackingChange())
    assert.isFalse(new UpdateTaskDTO({ title: 'Test' }).hasTimeTrackingChange())
  })
})

// ============================================================================
// UpdateTaskDTO - Removal Detection
// ============================================================================
test.group('UpdateTaskDTO | Removal Detection', () => {
  test('isUnassigning detects null assigned_to', ({ assert }) => {
    assert.isTrue(new UpdateTaskDTO({ assigned_to: null }).isUnassigning())
    assert.isFalse(new UpdateTaskDTO({ assigned_to: VALID_UUID }).isUnassigning())
    assert.isFalse(new UpdateTaskDTO({ title: 'Test' }).isUnassigning())
  })

  test('isRemovingDueDate detects null due_date', ({ assert }) => {
    assert.isTrue(new UpdateTaskDTO({ due_date: null }).isRemovingDueDate())
    assert.isFalse(new UpdateTaskDTO({ due_date: '2026-12-31' }).isRemovingDueDate())
    assert.isFalse(new UpdateTaskDTO({ title: 'Test' }).isRemovingDueDate())
  })

  test('isRemovingParent detects null parent_task_id', ({ assert }) => {
    assert.isTrue(new UpdateTaskDTO({ parent_task_id: null }).isRemovingParent())
    assert.isFalse(new UpdateTaskDTO({ parent_task_id: VALID_UUID }).isRemovingParent())
  })

  test('isRemovingProject detects null project_id', ({ assert }) => {
    assert.isTrue(new UpdateTaskDTO({ project_id: null }).isRemovingProject())
    assert.isFalse(new UpdateTaskDTO({ project_id: VALID_UUID }).isRemovingProject())
  })
})

// ============================================================================
// UpdateTaskDTO - toObject
// ============================================================================
test.group('UpdateTaskDTO | toObject', () => {
  test('toObject includes only provided fields', ({ assert }) => {
    const dto = new UpdateTaskDTO({ title: 'New Title', status: TaskStatus.DONE })
    const obj = dto.toObject()
    assert.equal(obj.title, 'New Title')
    assert.equal(obj.status, TaskStatus.DONE)
    assert.notProperty(obj, 'priority')
    assert.notProperty(obj, 'label')
    assert.notProperty(obj, 'assigned_to')
  })

  test('toObject includes null values for removal', ({ assert }) => {
    const dto = new UpdateTaskDTO({ assigned_to: null, due_date: null })
    const obj = dto.toObject()
    assert.isNull(obj.assigned_to)
    assert.isNull(obj.due_date)
  })
})

// ============================================================================
// UpdateTaskDTO - Audit
// ============================================================================
test.group('UpdateTaskDTO | Audit', () => {
  test('getAuditMessage lists changed fields', ({ assert }) => {
    const dto = new UpdateTaskDTO({ status: TaskStatus.DONE, title: 'Test' })
    const message = dto.getAuditMessage()
    assert.include(message, 'trạng thái')
    assert.include(message, 'tiêu đề')
  })

  test('getAuditMessage detects unassigning', ({ assert }) => {
    const dto = new UpdateTaskDTO({ assigned_to: null })
    assert.include(dto.getAuditMessage(), 'bỏ giao việc')
  })

  test('getAuditMessage detects removing deadline', ({ assert }) => {
    const dto = new UpdateTaskDTO({ due_date: null })
    assert.include(dto.getAuditMessage(), 'xóa deadline')
  })

  test('getChangesForAudit computes diff', ({ assert }) => {
    const dto = new UpdateTaskDTO({ title: 'New Title', status: TaskStatus.DONE })
    const currentTask = { title: 'Old Title', status: TaskStatus.TODO }
    const changes = dto.getChangesForAudit(currentTask)
    assert.equal(changes.length, 2)
    const titleChange = changes.find((c) => c.field === 'title')
    assert.equal(titleChange!.oldValue, 'Old Title')
    assert.equal(titleChange!.newValue, 'New Title')
  })

  test('getChangesForAudit ignores unchanged values', ({ assert }) => {
    const dto = new UpdateTaskDTO({ title: 'Same', status: TaskStatus.TODO })
    const currentTask = { title: 'Same', status: TaskStatus.TODO }
    const changes = dto.getChangesForAudit(currentTask)
    assert.equal(changes.length, 0)
  })
})
