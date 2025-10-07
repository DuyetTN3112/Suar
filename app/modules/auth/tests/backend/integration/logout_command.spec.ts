import { test } from '@japa/runner'

import AuditLog from '#modules/audit/infra/models/audit_log'
import type { AuthActionContext } from '#modules/auth/actions/auth_action_context'
import LogoutUserCommand from '#modules/auth/actions/commands/logout_user_command'
import { LogoutUserDTO } from '#modules/auth/actions/dtos/request/logout_user_dto'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'

async function findLogoutAuditLogs(userId: string) {
  return AuditLog.query()
    .where('user_id', userId)
    .where('action', 'logout')
    .where('entity_type', 'user')
    .where('entity_id', userId)
}

async function waitForLogoutAuditLogs(userId: string, expectedCount: number) {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const logs = await findLogoutAuditLogs(userId)
    if (logs.length >= expectedCount) {
      return logs
    }
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
  return findLogoutAuditLogs(userId)
}

async function countAuditLogs() {
  const logs = await AuditLog.query()
  return logs.length
}

test.group('Integration | Logout Command', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(() => cleanupTestData())

  test('authenticated logout writes an audit trail with actor context and logout request metadata', async ({
    assert,
  }) => {
    const user = await UserFactory.create()
    const execCtx: AuthActionContext = {
      userId: user.id,
      ip: '203.0.113.9',
      userAgent: 'logout-command-integration-spec',
      organizationId: null,
      requestId: null,
      traceId: null,
      workflowId: null,
    }

    await new LogoutUserCommand(execCtx).handle(
      new LogoutUserDTO({
        userId: user.id,
        sessionId: 'session-abc-123',
        ipAddress: '198.51.100.7',
      })
    )

    const logs = await waitForLogoutAuditLogs(user.id, 2)

    assert.lengthOf(logs, 2)
    const commandLog = logs.find((log) => log.new_values?.['sessionId'] === 'session-abc-123')
    const eventLog = logs.find((log) => log.new_values === null)

    assert.exists(commandLog)
    if (!commandLog) {
      assert.fail('Expected logout command audit log')
      return
    }
    assert.equal(commandLog.ip_address, execCtx.ip)
    assert.equal(commandLog.user_agent, execCtx.userAgent)
    assert.equal(commandLog.new_values?.['ip'], '198.51.100.7')
    assert.exists(commandLog.new_values?.['timestamp'])

    assert.exists(eventLog)
    if (!eventLog) {
      assert.fail('Expected logout event audit log')
      return
    }
    assert.equal(eventLog.ip_address, '198.51.100.7')
    assert.equal(eventLog.user_agent, '')
  })

  test('logout payload rejects missing user id and source ip before command execution', ({
    assert,
  }) => {
    assert.throws(
      () =>
        new LogoutUserDTO({
          userId: '',
          sessionId: 'session-abc-123',
          ipAddress: '198.51.100.7',
        }),
      /User ID is required/
    )
    assert.throws(
      () => new LogoutUserDTO({ userId: '1', sessionId: 'session-abc-123', ipAddress: '' }),
      /IP address is required/
    )
  })

  test('guest logout route rejects without creating logout audit entries', async ({
    assert,
    client,
  }) => {
    const auditLogsBefore = await countAuditLogs()

    const response = await client.get('/logout').redirects(0)

    response.assertStatus(401)
    assert.notInclude(response.text(), 'E_INTERNAL_ERROR')
    assert.notInclude(response.text(), '500')
    assert.equal(await countAuditLogs(), auditLogsBefore)
  })
})
