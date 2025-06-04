import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import CreateTaskDTO from '#actions/tasks/dtos/create_task_dto'
import { TaskStatus } from '#constants/task_constants'

const VALID_UUID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
const VALID_UUID_2 = 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e'

const validData = () => ({
  title: 'Test Task',
  status: TaskStatus.TODO,
  organization_id: VALID_UUID,
})

// ============================================================================
// CreateTaskDTO - Construction & Validation
// ============================================================================
test.group('CreateTaskDTO | Construction', () => {
  test('creates with minimal required fields', ({ assert }) => {
    const dto = new CreateTaskDTO(validData())
    assert.equal(dto.title, 'Test Task')
    assert.equal(dto.status, TaskStatus.TODO)
    assert.equal(dto.organization_id, VALID_UUID)
    assert.equal(dto.estimated_time, 0)
    assert.equal(dto.actual_time, 0)
  })

  test('creates with all optional fields', ({ assert }) => {
    const dto = new CreateTaskDTO({
      ...validData(),
      description: 'A description',
      label: 'bug',
      priority: 'high',
      assigned_to: VALID_UUID_2,
      parent_task_id: VALID_UUID,
      project_id: VALID_UUID,
      estimated_time: 5,
      actual_time: 2,
    })
    assert.equal(dto.description, 'A description')
    assert.equal(dto.label, 'bug')
    assert.equal(dto.priority, 'high')
    assert.equal(dto.estimated_time, 5)
  })

  test('trims title whitespace', ({ assert }) => {
    const dto = new CreateTaskDTO({ ...validData(), title: '  Spaced Title  ' })
    assert.equal(dto.title, 'Spaced Title')
  })

  test('trims description whitespace', ({ assert }) => {
    const dto = new CreateTaskDTO({ ...validData(), description: '  desc  ' })
    assert.equal(dto.description, 'desc')
  })

  test('parses due_date from ISO string', ({ assert }) => {
    const dto = new CreateTaskDTO({ ...validData(), due_date: '2026-06-15T10:00:00.000Z' })
    assert.instanceOf(dto.due_date, DateTime)
    assert.equal(dto.due_date!.year, 2026)
  })

  test('accepts DateTime object for due_date', ({ assert }) => {
    const dt = DateTime.fromISO('2026-12-25')
    const dto = new CreateTaskDTO({ ...validData(), due_date: dt })
    assert.equal(dto.due_date, dt)
  })

  test('throws for empty title', ({ assert }) => {
    assert.throws(() => new CreateTaskDTO({ ...validData(), title: '' }))
  })

  test('throws for title shorter than 3 chars', ({ assert }) => {
    assert.throws(() => new CreateTaskDTO({ ...validData(), title: 'AB' }))
  })

  test('throws for title longer than 255 chars', ({ assert }) => {
    assert.throws(() => new CreateTaskDTO({ ...validData(), title: 'A'.repeat(256) }))
  })

  test('throws for description longer than 5000 chars', ({ assert }) => {
    assert.throws(() => new CreateTaskDTO({ ...validData(), description: 'D'.repeat(5001) }))
  })

  test('throws for invalid status', ({ assert }) => {
    assert.throws(() => new CreateTaskDTO({ ...validData(), status: 'invalid_status' }))
  })

  test('accepts all valid statuses', ({ assert }) => {
    for (const status of Object.values(TaskStatus)) {
      const dto = new CreateTaskDTO({ ...validData(), status })
      assert.equal(dto.status, status)
    }
  })

  test('throws for invalid label', ({ assert }) => {
    assert.throws(() => new CreateTaskDTO({ ...validData(), label: 'invalid_label' }))
  })

  test('throws for invalid priority', ({ assert }) => {
    assert.throws(() => new CreateTaskDTO({ ...validData(), priority: 'invalid' }))
  })

  test('throws for missing organization_id', ({ assert }) => {
    assert.throws(() => new CreateTaskDTO({ title: 'Test', status: 'todo', organization_id: '' }))
  })

  test('throws for negative estimated_time', ({ assert }) => {
    assert.throws(() => new CreateTaskDTO({ ...validData(), estimated_time: -1 }))
  })

  test('throws for negative actual_time', ({ assert }) => {
    assert.throws(() => new CreateTaskDTO({ ...validData(), actual_time: -1 }))
  })

  test('throws for invalid due_date string', ({ assert }) => {
    assert.throws(() => new CreateTaskDTO({ ...validData(), due_date: 'not-a-date' }))
  })
})

// ============================================================================
// CreateTaskDTO - Business Logic Methods
// ============================================================================
test.group('CreateTaskDTO | Business Logic', () => {
  test('isAssigned returns true when assigned', ({ assert }) => {
    const dto = new CreateTaskDTO({ ...validData(), assigned_to: VALID_UUID_2 })
    assert.isTrue(dto.isAssigned())
  })

  test('isAssigned returns false when not assigned', ({ assert }) => {
    const dto = new CreateTaskDTO(validData())
    assert.isFalse(dto.isAssigned())
  })

  test('hasDueDate returns true when due_date set', ({ assert }) => {
    const dto = new CreateTaskDTO({ ...validData(), due_date: '2026-12-31' })
    assert.isTrue(dto.hasDueDate())
  })

  test('hasDueDate returns false when no due_date', ({ assert }) => {
    const dto = new CreateTaskDTO(validData())
    assert.isFalse(dto.hasDueDate())
  })

  test('isSubtask returns true when parent_task_id set', ({ assert }) => {
    const dto = new CreateTaskDTO({ ...validData(), parent_task_id: VALID_UUID })
    assert.isTrue(dto.isSubtask())
  })

  test('isSubtask returns false when no parent', ({ assert }) => {
    const dto = new CreateTaskDTO(validData())
    assert.isFalse(dto.isSubtask())
  })

  test('belongsToProject returns true when project_id set', ({ assert }) => {
    const dto = new CreateTaskDTO({ ...validData(), project_id: VALID_UUID })
    assert.isTrue(dto.belongsToProject())
  })

  test('belongsToProject returns false when no project', ({ assert }) => {
    const dto = new CreateTaskDTO(validData())
    assert.isFalse(dto.belongsToProject())
  })

  test('hasEstimatedTime returns true when > 0', ({ assert }) => {
    const dto = new CreateTaskDTO({ ...validData(), estimated_time: 5 })
    assert.isTrue(dto.hasEstimatedTime())
  })

  test('hasEstimatedTime returns false when 0', ({ assert }) => {
    const dto = new CreateTaskDTO(validData())
    assert.isFalse(dto.hasEstimatedTime())
  })

  test('getDaysUntilDue returns null when no due_date', ({ assert }) => {
    const dto = new CreateTaskDTO(validData())
    assert.isNull(dto.getDaysUntilDue())
  })

  test('getDaysUntilDue returns positive for future dates', ({ assert }) => {
    const futureDate = DateTime.now().plus({ days: 10 })
    const dto = new CreateTaskDTO({ ...validData(), due_date: futureDate })
    const days = dto.getDaysUntilDue()
    assert.isNotNull(days)
    assert.isAbove(days!, 0)
  })

  test('isOverdue returns false when no due_date', ({ assert }) => {
    const dto = new CreateTaskDTO(validData())
    assert.isFalse(dto.isOverdue())
  })

  test('isOverdue returns true for past dates', ({ assert }) => {
    const pastDate = DateTime.now().minus({ days: 5 })
    const dto = new CreateTaskDTO({ ...validData(), due_date: pastDate })
    assert.isTrue(dto.isOverdue())
  })

  test('isOverdue returns false for future dates', ({ assert }) => {
    const futureDate = DateTime.now().plus({ days: 5 })
    const dto = new CreateTaskDTO({ ...validData(), due_date: futureDate })
    assert.isFalse(dto.isOverdue())
  })
})

// ============================================================================
// CreateTaskDTO - toObject & Audit
// ============================================================================
test.group('CreateTaskDTO | Serialization', () => {
  test('toObject includes all fields', ({ assert }) => {
    const dto = new CreateTaskDTO({ ...validData(), label: 'bug', priority: 'high' })
    const obj = dto.toObject()
    assert.equal(obj.title, 'Test Task')
    assert.equal(obj.status, TaskStatus.TODO)
    assert.equal(obj.label, 'bug')
    assert.equal(obj.priority, 'high')
    assert.equal(obj.organization_id, VALID_UUID)
    assert.equal(obj.estimated_time, 0)
    assert.isNull(obj.assigned_to)
    assert.isNull(obj.parent_task_id)
    assert.isNull(obj.project_id)
  })

  test('getAuditMessage includes title', ({ assert }) => {
    const dto = new CreateTaskDTO(validData())
    assert.include(dto.getAuditMessage(), 'Test Task')
  })

  test('getAuditMessage includes assignee info', ({ assert }) => {
    const dto = new CreateTaskDTO({ ...validData(), assigned_to: VALID_UUID_2 })
    assert.include(dto.getAuditMessage(), 'giao cho')
    assert.include(dto.getAuditMessage(), String(VALID_UUID_2))
  })

  test('getAuditMessage includes subtask info', ({ assert }) => {
    const dto = new CreateTaskDTO({ ...validData(), parent_task_id: VALID_UUID })
    assert.include(dto.getAuditMessage(), 'subtask')
  })

  test('getAuditMessage includes project info', ({ assert }) => {
    const dto = new CreateTaskDTO({ ...validData(), project_id: VALID_UUID })
    assert.include(dto.getAuditMessage(), 'dự án')
  })
})
