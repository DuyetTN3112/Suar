import { test } from '@japa/runner'
import {
  pickAuditFields,
  createAuditDescription,
  createAuditDescriptionVi,
  formatAuditChanges,
  prepareDeleteManyLog,
} from '#libs/audit_log_helpers'
import { AuditAction, EntityType } from '#constants/audit_constants'

// ============================================================================
// pickAuditFields
// ============================================================================
test.group('pickAuditFields', () => {
  test('picks specified fields from object', ({ assert }) => {
    const obj = { id: 1, name: 'Alice', email: 'a@b.com', age: 30 }
    const result = pickAuditFields(obj, ['id', 'name'] as const)
    assert.deepEqual(result, { id: 1, name: 'Alice' })
  })

  test('ignores fields not present in object', ({ assert }) => {
    const obj = { id: 1, name: 'Alice' }
    const result = pickAuditFields(obj, ['id', 'email'] as unknown as readonly (keyof typeof obj)[])
    assert.equal(result.id, 1)
    assert.notProperty(result, 'email')
  })

  test('returns empty object for empty fields array', ({ assert }) => {
    const obj = { id: 1, name: 'Alice' }
    const result = pickAuditFields(obj, [])
    assert.deepEqual(result, {})
  })
})

// ============================================================================
// createAuditDescription
// ============================================================================
test.group('createAuditDescription', () => {
  test('creates description for CREATE action', ({ assert }) => {
    const desc = createAuditDescription(AuditAction.CREATE, EntityType.USER, 42)
    assert.equal(desc, 'Created user #42')
  })

  test('creates description for DELETE action', ({ assert }) => {
    const desc = createAuditDescription(AuditAction.DELETE, EntityType.TASK, 10)
    assert.equal(desc, 'Deleted task #10')
  })

  test('creates description for UPDATE action with additional info', ({ assert }) => {
    const desc = createAuditDescription(AuditAction.UPDATE, EntityType.PROJECT, 5, 'name changed')
    assert.equal(desc, 'Updated project #5 - name changed')
  })

  test('creates description for LOGIN action', ({ assert }) => {
    const desc = createAuditDescription(AuditAction.LOGIN, EntityType.USER, 1)
    assert.equal(desc, 'Logged in user #1')
  })

  test('creates description for SOFT_DELETE action', ({ assert }) => {
    const desc = createAuditDescription(AuditAction.SOFT_DELETE, EntityType.ORGANIZATION, 7)
    assert.equal(desc, 'Soft deleted organization #7')
  })

  test('creates description for ASSIGN action', ({ assert }) => {
    const desc = createAuditDescription(AuditAction.ASSIGN, EntityType.TASK_ASSIGNMENT, 99)
    assert.equal(desc, 'Assigned task_assignment #99')
  })

  test('handles string entityId', ({ assert }) => {
    const desc = createAuditDescription(AuditAction.CREATE, EntityType.USER, 'abc-123')
    assert.equal(desc, 'Created user #abc-123')
  })
})

// ============================================================================
// createAuditDescriptionVi
// ============================================================================
test.group('createAuditDescriptionVi', () => {
  test('creates Vietnamese description for CREATE user', ({ assert }) => {
    const desc = createAuditDescriptionVi(AuditAction.CREATE, EntityType.USER, 42)
    assert.equal(desc, 'Đã tạo người dùng #42')
  })

  test('creates Vietnamese description for DELETE task', ({ assert }) => {
    const desc = createAuditDescriptionVi(AuditAction.DELETE, EntityType.TASK, 10)
    assert.equal(desc, 'Đã xóa công việc #10')
  })

  test('creates Vietnamese description with additional info', ({ assert }) => {
    const desc = createAuditDescriptionVi(AuditAction.UPDATE, EntityType.PROJECT, 5, 'đổi tên')
    assert.equal(desc, 'Đã cập nhật dự án #5 - đổi tên')
  })

  test('creates Vietnamese description for APPROVE', ({ assert }) => {
    const desc = createAuditDescriptionVi(AuditAction.APPROVE, EntityType.TASK_APPLICATION, 3)
    assert.equal(desc, 'Đã phê duyệt đơn ứng tuyển #3')
  })

  test('creates Vietnamese description for INVITE to organization', ({ assert }) => {
    const desc = createAuditDescriptionVi(AuditAction.INVITE, EntityType.ORGANIZATION, 8)
    assert.equal(desc, 'Đã mời vào tổ chức #8')
  })
})

// ============================================================================
// formatAuditChanges
// ============================================================================
test.group('formatAuditChanges', () => {
  test('detects changed fields', ({ assert }) => {
    const old = { name: 'Alice', age: 30 }
    const updated = { name: 'Bob', age: 30 }
    const changes = formatAuditChanges(old, updated)
    assert.equal(changes.length, 1)
    assert.equal(changes[0]!.field, 'name')
    assert.equal(changes[0]!.oldValue, 'Alice')
    assert.equal(changes[0]!.newValue, 'Bob')
  })

  test('detects multiple changed fields', ({ assert }) => {
    const old = { name: 'Alice', age: 30, email: 'a@b.com' }
    const updated = { name: 'Bob', age: 31, email: 'a@b.com' }
    const changes = formatAuditChanges(old, updated)
    assert.equal(changes.length, 2)
    const fields = changes.map((c) => c.field)
    assert.includeMembers(fields, ['name', 'age'])
  })

  test('returns empty array for identical objects', ({ assert }) => {
    const obj = { name: 'Alice', age: 30 }
    const changes = formatAuditChanges(obj, { ...obj })
    assert.deepEqual(changes, [])
  })

  test('returns empty array for both null', ({ assert }) => {
    const changes = formatAuditChanges(null, null)
    assert.deepEqual(changes, [])
  })

  test('detects additions when old is null', ({ assert }) => {
    const changes = formatAuditChanges(null, { name: 'Alice' })
    assert.equal(changes.length, 1)
    assert.equal(changes[0]!.field, 'name')
    assert.isUndefined(changes[0]!.oldValue)
    assert.equal(changes[0]!.newValue, 'Alice')
  })

  test('detects removals when new is null', ({ assert }) => {
    const changes = formatAuditChanges({ name: 'Alice' }, null)
    assert.equal(changes.length, 1)
    assert.equal(changes[0]!.field, 'name')
    assert.equal(changes[0]!.oldValue, 'Alice')
    assert.isUndefined(changes[0]!.newValue)
  })

  test('excludes specified fields', ({ assert }) => {
    const old = { name: 'Alice', password: 'old123', age: 30 }
    const updated = { name: 'Bob', password: 'new456', age: 31 }
    const changes = formatAuditChanges(old, updated, ['password'])
    const fields = changes.map((c) => c.field)
    assert.notInclude(fields, 'password')
    assert.includeMembers(fields, ['name', 'age'])
  })

  test('handles nested object changes via JSON comparison', ({ assert }) => {
    const old = { data: { x: 1 } }
    const updated = { data: { x: 2 } }
    const changes = formatAuditChanges(old, updated)
    assert.equal(changes.length, 1)
    assert.deepEqual(changes[0]!.oldValue, { x: 1 })
    assert.deepEqual(changes[0]!.newValue, { x: 2 })
  })
})

// ============================================================================
// prepareDeleteManyLog
// ============================================================================
test.group('prepareDeleteManyLog', () => {
  test('picks default id field from items', ({ assert }) => {
    const items = [
      { id: 1, name: 'A' },
      { id: 2, name: 'B' },
    ]
    const result = prepareDeleteManyLog({
      userId: 1,
      entityType: EntityType.USER,
      deletedItems: items,
    })
    assert.deepEqual(result, [{ id: 1 }, { id: 2 }])
  })

  test('picks specified fields', ({ assert }) => {
    const items = [
      { id: 1, name: 'Alice', email: 'a@b.com' },
      { id: 2, name: 'Bob', email: 'b@c.com' },
    ]
    const result = prepareDeleteManyLog({
      userId: 1,
      entityType: EntityType.USER,
      deletedItems: items,
      fields: ['id', 'name'] as const,
    })
    assert.deepEqual(result, [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ])
  })

  test('returns empty array for empty items', ({ assert }) => {
    const result = prepareDeleteManyLog({
      userId: 1,
      entityType: EntityType.TASK,
      deletedItems: [],
    })
    assert.deepEqual(result, [])
  })
})
