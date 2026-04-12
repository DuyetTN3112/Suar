import { test } from '@japa/runner'

import ListAuditLogsQuery from '#actions/admin/audit_logs/queries/list_audit_logs_query'
import { MongoAuditLogModel } from '#models/mongo/audit_log'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'
import { ExecutionContext } from '#types/execution_context'

test.group('Integration | Admin Audit Logs', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('lists Mongo-backed audit logs and resolves user info from Postgres', async ({ assert }) => {
    const superadmin = await UserFactory.createSuperadmin()
    const actor = await UserFactory.create({ username: 'audit_target_user' })

    await MongoAuditLogModel.create({
      user_id: actor.id,
      action: 'test_admin_audit_log',
      entity_type: 'task',
      entity_id: 'task-test-id',
      old_values: { status: 'todo' },
      new_values: { status: 'done' },
      ip_address: '127.0.0.1',
      user_agent: 'integration-test',
    })

    const result = await new ListAuditLogsQuery(ExecutionContext.system(superadmin.id)).handle({
      page: 1,
      perPage: 50,
      search: actor.username,
    })

    const log = result.data.find((item) => item.action === 'test_admin_audit_log')
    assert.isDefined(log)
    assert.equal(log?.user?.id, actor.id)
    assert.equal(log?.user?.username, actor.username)
    assert.equal(log?.resource_type, 'task')
    assert.equal(log?.resource_id, 'task-test-id')
    const newValues = (log?.details.new_values ?? {}) as { status?: string }
    assert.equal(newValues.status, 'done')
  })
})
