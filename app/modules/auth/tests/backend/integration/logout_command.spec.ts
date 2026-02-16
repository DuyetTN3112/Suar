import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { logoutUserCommand } from '#composition/auth_application_composition'
import AuditLog from '#modules/audit/infra/models/audit_log'
import type { AuthActionContext } from '#modules/auth/actions/auth_action_context'
import { LogoutUserDTO } from '#modules/auth/actions/dtos/request/logout_user_dto'
import { AdonisDomainEventDispatcher } from '#modules/events/infra/adapters/adonis_domain_event_dispatcher'
import { PostgresDomainEventOutboxRepository } from '#modules/events/infra/postgres_domain_event_outbox_repository'
import { DomainEventOutboxWorker } from '#modules/events/infra/workers/domain_event_outbox_worker'
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

async function cleanupAuthSessionEvidence() {
  await db.from('auth_session_event_receipts').delete()
  await db
    .from('domain_event_outbox')
    .where('event_name', 'auth:session:observed:v1')
    .delete()
}

test.group('Integration | Logout Command', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(async () => {
    await cleanupAuthSessionEvidence()
    await cleanupTestData()
  })

  test('authenticated logout writes one canonical privacy-safe audit event', async ({
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

    await logoutUserCommand.execute({
      context: execCtx,
      dto: new LogoutUserDTO({
        userId: user.id,
        sessionId: 'session-abc-123',
        ipAddress: '198.51.100.7',
      }),
      revokeWebSession: () => Promise.resolve(),
    })
    const delivery = await new DomainEventOutboxWorker({
      workerId: 'logout-command-integration',
      repository: new PostgresDomainEventOutboxRepository(),
      dispatcher: new AdonisDomainEventDispatcher(),
    }).runOnce()

    const logs = await waitForLogoutAuditLogs(user.id, 1)

    assert.equal(delivery.processed, 1)
    assert.lengthOf(logs, 1)
    const [logoutLog] = logs
    assert.exists(logoutLog)
    if (!logoutLog) return
    const enterpriseLog = logoutLog as typeof logoutLog & {
      event_name?: string | null
      event_family?: string | null
      outcome?: string | null
    }

    assert.equal(logoutLog.ip_address, execCtx.ip)
    assert.equal(logoutLog.user_agent, execCtx.userAgent)
    assert.equal(enterpriseLog.event_name, 'auth.logout.succeeded')
    assert.equal(enterpriseLog.event_family, 'auth.session')
    assert.equal(enterpriseLog.outcome, 'success')
    assert.isNull(logoutLog.new_values)
    assert.notInclude(JSON.stringify(logoutLog), 'session-abc-123')
    assert.notInclude(JSON.stringify(logoutLog.new_values), '198.51.100.7')
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
