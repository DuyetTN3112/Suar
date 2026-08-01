import { test } from '@japa/runner'

import { makeSystemAdminActionContext } from '#modules/admin/audit_logs/actions/action_context'
import type {
  AdminAuditEventListInput,
  AdminAuditEventReader,
} from '#modules/admin/audit_logs/actions/ports/outbound/admin_audit_event_reader'
import type { AdminAuditProjectionReader } from '#modules/admin/audit_logs/actions/ports/outbound/admin_audit_projection_reader'
import ListAuditLogsQuery from '#modules/admin/audit_logs/actions/query/list_audit_logs_query'

test.group('Unit | Admin audit read boundary', () => {
  test('supplies resolved cross-domain projections to the Audit-owned event reader', async ({
    assert,
  }) => {
    let capturedInput: AdminAuditEventListInput | null = null
    const eventReader: AdminAuditEventReader = {
      list(input) {
        capturedInput = input
        return Promise.resolve({
          data: [
            {
              id: 'event-1',
              user_id: 'actor-1',
              action: 'task.updated',
              entity_type: 'task',
              entity_id: 'task-1',
              old_values: null,
              new_values: { title: 'New title' },
              ip_address: null,
              user_agent: null,
              created_at: new Date('2026-07-26T10:00:00.000Z'),
              target_type: 'task',
              target_id: 'task-1',
            },
          ],
          total: 1,
          nextCursor: null,
          previousCursor: null,
          hasNextPage: false,
          hasPreviousPage: false,
        })
      },
    }
    const projectionReader: AdminAuditProjectionReader = {
      buildSearchProjection() {
        return Promise.resolve({
          matchedActorUserIds: ['actor-1'],
          organizationScopedTargets: [{ type: 'task', ids: ['task-1'] }],
          matchedTargets: [{ type: 'task', ids: ['task-1'] }],
        })
      },
      findActorsByIds() {
        return Promise.resolve([{ id: 'actor-1', username: 'auditor' }])
      },
      resolveTargetLabels() {
        return Promise.resolve(new Map([['task:task-1', 'Boundary task']]))
      },
    }
    const query = new ListAuditLogsQuery(
      makeSystemAdminActionContext('admin-1'),
      eventReader,
      projectionReader
    )
    const result = await query.handle({
      page: 1,
      perPage: 25,
      surface: 'organization',
      organizationId: 'organization-1',
      search: 'Boundary',
    })

    assert.deepInclude(capturedInput, {
      surface: 'organization',
      organizationId: 'organization-1',
      searchMatchedActorUserIds: ['actor-1'],
      organizationScopedTargets: [{ type: 'task', ids: ['task-1'] }],
      searchMatchedTargets: [{ type: 'task', ids: ['task-1'] }],
    })
    assert.equal(result.data[0]?.user?.username, 'auditor')
    assert.equal(result.data[0]?.target_label, 'Boundary task')
  })
})
