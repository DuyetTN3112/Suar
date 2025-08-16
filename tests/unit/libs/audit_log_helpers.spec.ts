import { test } from '@japa/runner'

import {
  pickAuditFields,
  createAuditDescription,
  createAuditDescriptionVi,
  formatAuditChanges,
  prepareDeleteManyLog,
  maskSensitiveFields,
} from '#libs/audit_log_helpers'
import { AuditAction, EntityType } from '#modules/audit/constants/audit_constants'

test.group('Audit log helpers', () => {
  test('selection and description helpers keep audit payloads focused and readable', ({
    assert,
  }) => {
    assert.deepEqual(pickAuditFields({ id: 1, name: 'Task', status: 'done' }, ['id', 'status']), {
      id: 1,
      status: 'done',
    })

    const prepared = prepareDeleteManyLog({
      userId: 1,
      entityType: EntityType.TASK,
      deletedItems: [
        { id: 'task-1', title: 'Task A', status: 'done' },
        { id: 'task-2', title: 'Task B', status: 'cancelled' },
      ],
      fields: ['id', 'title'],
    })

    assert.deepEqual(prepared, [
      { id: 'task-1', title: 'Task A' },
      { id: 'task-2', title: 'Task B' },
    ])
    assert.equal(
      createAuditDescription(AuditAction.UPDATE, EntityType.TASK, 'task-1', 'status changed'),
      'Updated task #task-1 - status changed'
    )
    assert.equal(
      createAuditDescriptionVi(
        AuditAction.ASSIGN,
        EntityType.PROJECT_MEMBER,
        'member-1',
        'manager role'
      ),
      'Đã giao việc thành viên dự án #member-1 - manager role'
    )
  })

  test('formatAuditChanges captures additions, removals, nested updates, and stable exclusions', ({
    assert,
  }) => {
    assert.deepEqual(formatAuditChanges(null, { id: 1, status: 'done' }), [
      { field: 'id', oldValue: undefined, newValue: 1 },
      { field: 'status', oldValue: undefined, newValue: 'done' },
    ])
    assert.deepEqual(formatAuditChanges({ id: 1, status: 'todo' }, null), [
      { field: 'id', oldValue: 1, newValue: undefined },
      { field: 'status', oldValue: 'todo', newValue: undefined },
    ])
    assert.deepEqual(
      formatAuditChanges(
        { config: { enabled: false }, title: 'Old' },
        { config: { enabled: true }, title: 'New' }
      ),
      [
        { field: 'config', oldValue: { enabled: false }, newValue: { enabled: true } },
        { field: 'title', oldValue: 'Old', newValue: 'New' },
      ]
    )
    assert.deepEqual(
      formatAuditChanges({ id: 1, updated_at: 'a' }, { id: 1, updated_at: 'b' }, ['updated_at']),
      []
    )
    assert.deepEqual(formatAuditChanges({ id: 1 }, { id: 1 }), [])
  })

  test('maskSensitiveFields redacts only the fields that should never leak', ({ assert }) => {
    const masked = maskSensitiveFields({
      password: 'secret',
      token: 'abc',
      display_name: 'Visible',
    })

    assert.deepEqual(masked, {
      password: '***MASKED***',
      token: '***MASKED***',
      display_name: 'Visible',
    })
  })
})
