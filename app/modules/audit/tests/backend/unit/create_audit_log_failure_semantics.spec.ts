import { test } from '@japa/runner'

import { CreateAuditLogCommand } from '#modules/audit/actions/commands/audit-log/create_audit_log_command'
import { WriteAuditLogCommand } from '#modules/audit/actions/commands/audit-log/write_audit_log_command'
import type { AuditActionContext } from '#modules/audit/public_contracts/audit_action_context'
import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'

const execCtx: AuditActionContext = {
  userId: '11111111-1111-4111-8111-111111111111',
  ip: '127.0.0.1',
  userAgent: 'unit-test',
  organizationId: null,
}

const data = {
  user_id: '11111111-1111-4111-8111-111111111111',
  action: 'unit_test_audit',
  entity_type: 'unit_test',
  entity_id: '22222222-2222-4222-8222-222222222222',
}

test.group('CreateAuditLog failure semantics', () => {
  test('treats a missing authenticated actor as an internal contract violation', async ({
    assert,
  }) => {
    let caught: unknown
    try {
      await new WriteAuditLogCommand(
        {
          ...execCtx,
          userId: null,
        },
        {
          create: () => Promise.resolve(),
        }
      ).execute({
        action: 'unit_test_missing_actor',
        entity_type: 'unit_test',
        entity_id: data.entity_id,
      })
    } catch (error) {
      caught = error
    }

    assert.instanceOf(caught, InvariantViolationException)
    assert.equal((caught as InvariantViolationException).status, 500)
    assert.equal((caught as InvariantViolationException).safeMessage, 'Đã xảy ra lỗi hệ thống')
  })

  test('observes a noncritical write failure without exposing diagnostics', async ({ assert }) => {
    const secret = 'audit-database-token-do-not-log'
    let forcedPropagation = false
    const records: Array<{
      level: string
      eventName: string
      payload: Record<string, unknown>
    }> = []
    const command = new CreateAuditLogCommand(execCtx, {
      writer: (_context, input) => {
        forcedPropagation = input.critical === true
        return Promise.reject(new Error(`audit unavailable: ${secret}`))
      },
      operationalLogger: {
        logStructured(level, eventName, payload) {
          records.push({ level, eventName, payload })
        },
      },
    })

    assert.isFalse(await command.execute(data))
    assert.isTrue(forcedPropagation)
    assert.lengthOf(records, 1)
    assert.equal(records[0]?.level, 'warn')
    assert.equal(records[0]?.eventName, 'audit.write.noncritical_failed')
    assert.deepEqual(records[0]?.payload['error'], { class: 'Error' })
    assert.notInclude(JSON.stringify(records), secret)
    assert.notInclude(JSON.stringify(records), data.entity_id)
  })

  test('preserves noncritical semantics when the telemetry sink also fails', async ({ assert }) => {
    const command = new CreateAuditLogCommand(execCtx, {
      writer: () => Promise.reject(new Error('audit unavailable')),
      operationalLogger: {
        logStructured() {
          throw new Error('telemetry unavailable')
        },
      },
    })

    assert.isFalse(await command.execute(data))
  })

  test('rethrows a critical write failure without misreporting it as noncritical', async ({
    assert,
  }) => {
    let telemetryCalls = 0
    const failure = new Error('critical audit unavailable')
    const command = new CreateAuditLogCommand(execCtx, {
      writer: () => Promise.reject(failure),
      operationalLogger: {
        logStructured() {
          telemetryCalls += 1
        },
      },
    })

    let caught: unknown
    try {
      await command.execute(data, { critical: true })
    } catch (error) {
      caught = error
    }

    assert.strictEqual(caught, failure)
    assert.equal(telemetryCalls, 0)
  })
})
