import { test } from '@japa/runner'

import { ProjectAuditActivityReaderAdapter } from '#composition/adapters/projects/project_audit_activity_reader_adapter'
import type { AuditLogRecord } from '#modules/audit/public_contracts/audit_read_contract'

test.group('Unit | Project audit activity reader adapter', () => {
  test('coordinates recent audit records with identities and delegates member activity', async ({
    assert,
  }) => {
    const createdAt = new Date('2026-07-26T00:00:00.000Z')
    const logs: AuditLogRecord[] = [
      {
        id: 'audit-1',
        user_id: 'user-1',
        entity_type: 'project',
        entity_id: 'project-1',
        action: 'updated',
        created_at: createdAt,
        old_values: null,
        new_values: null,
      },
    ]
    const lastActivity = new Map([['user-1', createdAt]])
    const adapter = new ProjectAuditActivityReaderAdapter(
      (entityType, entityId, limit) => {
        assert.deepEqual([entityType, entityId, limit], ['project', 'project-1', 10])
        return Promise.resolve(logs)
      },
      (userIds) => {
        assert.deepEqual(userIds, ['user-1'])
        return Promise.resolve([{ id: 'user-1', username: 'Grace' }])
      },
      (entityType, entityId, userIds) => {
        assert.deepEqual([entityType, entityId, userIds], [
          'project',
          'project-1',
          ['user-1'],
        ])
        return Promise.resolve(lastActivity)
      }
    )

    assert.deepEqual(await adapter.listRecentProjectActivity('project-1', 10), [
      {
        id: 'audit-1',
        user_id: 'user-1',
        entity_type: 'project',
        entity_id: 'project-1',
        action: 'updated',
        created_at: createdAt,
        username: 'Grace',
      },
    ])
    assert.strictEqual(
      await adapter.getLastProjectActivityByUsers('project-1', ['user-1']),
      lastActivity
    )
  })
})
