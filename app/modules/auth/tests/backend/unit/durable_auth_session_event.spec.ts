import { test } from '@japa/runner'

import {
  DurableAuthSessionObservationStagerAdapter,
  type DurableAuthSessionObservationStagerDependencies,
} from '#composition/adapters/durable_auth_session_observation_stager_adapter'
import type { StageDomainEventInput } from '#modules/events/public_contracts/domain_event_outbox'

const payload = {
  eventId: '9b8c272e-384b-4f8b-bbce-2f55bb432079',
  userId: 'f79ed770-b2f5-488e-95fe-5919854351de',
  action: 'login' as const,
  occurredAt: '2026-07-26T10:00:00.000Z',
  ipAddress: '203.0.113.7',
  userAgent: 'stage-test',
  method: 'oauth',
  requestId: 'request-1',
  traceId: 'trace-1',
}

test.group('Durable auth session staging', () => {
  test('stages a stable event identity on a caller-bounded database transaction', async ({
    assert,
  }) => {
    const transactionToken = { rawQuery: () => undefined }
    const staged: { trx: object; input: StageDomainEventInput }[] = []
    const dependencies: DurableAuthSessionObservationStagerDependencies = {
      transaction: (callback) => callback(transactionToken),
      stage: (trx, input) => {
        staged.push({ trx, input })
        return Promise.resolve({ id: 'outbox-1', staged: true })
      },
    }

    await new DurableAuthSessionObservationStagerAdapter(dependencies).stage(payload)

    assert.deepEqual(staged, [
      {
        trx: transactionToken,
        input: {
          eventName: 'auth:session:observed:v1',
          dedupeKey: payload.eventId,
          aggregateType: 'auth_session',
          aggregateId: payload.userId,
          payload,
        },
      },
    ])
  })
})
