import { test } from '@japa/runner'

import { TaskAuditTrailReaderAdapter } from '#composition/adapters/task_audit_trail_reader_adapter'
import type { AuditLogRecord } from '#modules/audit/public_contracts/audit_read_contract'

test.group('Unit | Task audit trail reader adapter', () => {
  test('coordinates audit records and user identities into the task-owned projection', async ({
    assert,
  }) => {
    const createdAt = new Date('2026-07-26T00:00:00.000Z')
    const calls: unknown[][] = []
    const logs: AuditLogRecord[] = [
      {
        id: 'audit-1',
        user_id: 'user-1',
        entity_type: 'task',
        entity_id: 'task-1',
        action: 'updated',
        created_at: createdAt,
        old_values: { status: 'todo' },
        new_values: { status: 'done' },
      },
    ]
    const adapter = new TaskAuditTrailReaderAdapter(
      (entityType, entityId, limit) => {
        calls.push([entityType, entityId, limit])
        return Promise.resolve(logs)
      },
      (userIds) => {
        calls.push(userIds)
        return Promise.resolve([{ id: 'user-1', username: 'Ada', email: 'ada@example.test' }])
      },
      (oldValues, newValues) => {
        calls.push([oldValues, newValues])
        return [{ field: 'status', oldValue: 'todo', newValue: 'done' }]
      }
    )

    const result = await adapter.listTaskAuditTrail('task-1', 20)

    assert.deepEqual(calls, [
      ['task', 'task-1', 20],
      ['user-1'],
      [{ status: 'todo' }, { status: 'done' }],
    ])
    assert.deepEqual(result, [
      {
        id: 'audit-1',
        action: 'updated',
        user: { id: 'user-1', name: 'Ada', email: 'ada@example.test' },
        timestamp: createdAt,
        changes: [{ field: 'status', oldValue: 'todo', newValue: 'done' }],
      },
    ])
  })
})
