import { test } from '@japa/runner'

import type { AuditLogReadRepository } from '#modules/audit/actions/ports/outbound/audit_log_read_repository'
import { GetLastAuditActivityByUsersQuery } from '#modules/audit/actions/queries/get_last_audit_activity_by_users_query'
import { ListAdminAuditLogsQuery } from '#modules/audit/actions/queries/list_admin_audit_logs_query'
import { ListAuditLogsByEntityQuery } from '#modules/audit/actions/queries/list_audit_logs_by_entity_query'

test.group('Audit read queries', () => {
  test('delegate one read use case each through the outbound repository port', async ({
    assert,
  }) => {
    const calls: string[] = []
    const repository: AuditLogReadRepository = {
      listByEntity: (entityType, entityId, limit) => {
        calls.push(`entity:${entityType}:${entityId}:${limit}`)
        return Promise.resolve([])
      },
      listAdmin: (params) => {
        calls.push(`admin:${params.page}:${params.perPage}`)
        return Promise.resolve({
          data: [],
          total: 0,
          nextCursor: null,
          previousCursor: null,
          hasNextPage: false,
          hasPreviousPage: false,
        })
      },
      getLastActivityByUsers: (entityType, entityId, userIds) => {
        calls.push(`activity:${entityType}:${entityId}:${userIds.join(',')}`)
        return Promise.resolve(new Map(userIds.map((userId) => [userId, null])))
      },
    }

    await new ListAuditLogsByEntityQuery(repository).execute('task', 'task-1', 20)
    await new ListAdminAuditLogsQuery(repository).execute({ page: 2, perPage: 50 })
    const activity = await new GetLastAuditActivityByUsersQuery(repository).execute(
      'project',
      'project-1',
      ['user-1']
    )

    assert.deepEqual(calls, [
      'entity:task:task-1:20',
      'admin:2:50',
      'activity:project:project-1:user-1',
    ])
    assert.deepEqual(activity, new Map([['user-1', null]]))
  })
})
