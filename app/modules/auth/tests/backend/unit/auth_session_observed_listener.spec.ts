import { test } from '@japa/runner'

import ProcessAuthSessionObservedCommand, {
  type ProcessAuthSessionObservedDependencies,
} from '#modules/auth/actions/commands/process_auth_session_observed_command'
import { onAuthSessionObserved } from '#modules/auth/listeners/on_auth_session_observed'
import type { AuthSessionObservedEvent } from '#modules/events/public_contracts/domain_event_outbox'

const event: AuthSessionObservedEvent = {
  eventId: '9b8c272e-384b-4f8b-bbce-2f55bb432079',
  userId: 'f79ed770-b2f5-488e-95fe-5919854351de',
  action: 'login',
  occurredAt: '2026-07-26T10:00:00.000Z',
  ipAddress: '203.0.113.7',
  userAgent: 'consumer-test',
  method: 'oauth',
  requestId: 'request-1',
  traceId: 'trace-1',
}

function makeCommand(overrides: Partial<ProcessAuthSessionObservedDependencies> = {}): {
  command: ProcessAuthSessionObservedCommand
  auditWrites: unknown[][]
  transactionToken: object
} {
  const transactionToken = Object.create(null) as object
  const auditWrites: unknown[][] = []
  const dependencies: ProcessAuthSessionObservedDependencies = {
    transactions: {
      run: (callback) => callback(transactionToken),
    },
    receipts: {
      claim: () => Promise.resolve(true),
    },
    audit: {
      write: (...args) => {
        auditWrites.push(args)
        return Promise.resolve()
      },
    },
    ...overrides,
  }
  const command = new ProcessAuthSessionObservedCommand(dependencies)
  return { command, auditWrites, transactionToken }
}

test.group('Auth session observed delivery', () => {
  test('writes receipt and canonical critical audit in one transaction', async ({ assert }) => {
    const evidence = makeCommand()

    await onAuthSessionObserved(event, evidence.command)

    assert.lengthOf(evidence.auditWrites, 1)
    assert.strictEqual(evidence.auditWrites[0]?.[2], evidence.transactionToken)
    assert.deepInclude(evidence.auditWrites[0]?.[1], {
      event_name: 'auth.login.succeeded',
      correlation_key: event.eventId,
      source_occurred_at: event.occurredAt,
      critical: true,
    })
  })

  test('treats an existing matching receipt as an idempotent replay', async ({ assert }) => {
    const evidence = makeCommand({
      receipts: {
        claim: () => Promise.resolve(false),
      },
    })

    await onAuthSessionObserved(event, evidence.command)

    assert.isEmpty(evidence.auditWrites)
  })

  test('propagates atomic persistence failure for outbox retry', async ({ assert }) => {
    const evidence = makeCommand({
      audit: {
        write: () => Promise.reject(new Error('audit transaction failed')),
      },
    })

    await assert.rejects(
      () => onAuthSessionObserved(event, evidence.command),
      /audit transaction failed/
    )
  })
})
