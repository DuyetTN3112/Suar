import { test } from '@japa/runner'

import {
  resolveErrorEventServicePrincipal,
  type ErrorEventServicePrincipalIdentity,
} from '#modules/authorization/public_contracts/error_event_service_principal'
import { PurgeErrorEventRetentionCommand } from '#modules/errors/actions/commands/error-event-retention/purge_error_event_retention_command'
import { PreviewErrorEventRetentionQuery } from '#modules/errors/actions/queries/error-event-retention/preview_error_event_retention_query'
import { ERROR_EVENT_RETENTION_COUNT_CAP } from '#modules/errors/domain/error-event-retention/error_event_retention_policy'

const actorId = '019c0028-2ddc-7d42-96e8-918675f98c31'
const now = new Date('2026-07-26T12:00:00.000Z')

async function issuedIdentity(): Promise<ErrorEventServicePrincipalIdentity> {
  return resolveErrorEventServicePrincipal(actorId, {
    findPrincipal: () =>
      Promise.resolve({
        id: actorId,
        systemRole: 'system_admin',
        status: 'active',
      }),
    hasPermission: () => Promise.resolve(true),
  })
}

test.group('Error event retention use cases', () => {
  test('requires an active authorized environment-bound service principal', async ({ assert }) => {
    await assert.rejects(
      () =>
        resolveErrorEventServicePrincipal(undefined, {
          findPrincipal: () => Promise.resolve(null),
          hasPermission: () => Promise.resolve(true),
        }),
      /ERROR_EVENT_RETENTION_SERVICE_PRINCIPAL_ID/
    )
    await assert.rejects(
      () =>
        resolveErrorEventServicePrincipal(actorId, {
          findPrincipal: () =>
            Promise.resolve({
              id: actorId,
              systemRole: 'member',
              status: 'active',
            }),
          hasPermission: () => Promise.resolve(false),
        }),
      /inactive or unauthorized/
    )
  })

  test('rejects a forged identity before repository access', async ({ assert }) => {
    let repositoryCalled = false
    const query = new PreviewErrorEventRetentionQuery({
      countDue: () => {
        repositoryCalled = true
        return Promise.resolve(0)
      },
      purgeDue: () => Promise.resolve(0),
    })

    await assert.rejects(
      () =>
        query.execute({
          now,
          retentionDays: 30,
          execution: {
            userId: actorId,
            operatorIdentity: {
              actorId,
              actorRoleSurface: 'system_admin',
              actorType: 'service',
              authenticationProvenance: 'runtime_environment',
              configurationKey: 'ERROR_EVENT_RETENTION_SERVICE_PRINCIPAL_ID',
            },
          },
        }),
      /trusted error-event service-principal binding/
    )
    assert.isFalse(repositoryCalled)
  })

  test('returns only a bounded due count and deterministic cutoff', async ({ assert }) => {
    const identity = await issuedIdentity()
    const calls: Array<{ cutoff: Date; cap: number }> = []
    const query = new PreviewErrorEventRetentionQuery({
      countDue: (cutoff, cap) => {
        calls.push({ cutoff, cap })
        return Promise.resolve(ERROR_EVENT_RETENTION_COUNT_CAP)
      },
      purgeDue: () => Promise.resolve(0),
    })

    const preview = await query.execute({
      now,
      retentionDays: 30,
      execution: { userId: actorId, operatorIdentity: identity },
    })

    assert.equal(preview.cutoff.toISOString(), '2026-06-26T12:00:00.000Z')
    assert.equal(preview.dueCount, ERROR_EVENT_RETENTION_COUNT_CAP - 1)
    assert.isTrue(preview.countCapped)
    assert.equal(calls[0]?.cap, ERROR_EVENT_RETENTION_COUNT_CAP)
  })

  test('requires bounded parameters and explicit destructive confirmation', async ({ assert }) => {
    const identity = await issuedIdentity()
    const command = new PurgeErrorEventRetentionCommand({
      countDue: () => Promise.resolve(0),
      purgeDue: () => Promise.resolve(0),
    })
    const base = {
      now,
      retentionDays: 30,
      batchSize: 100,
      reason: 'scheduled privacy retention',
      execution: { userId: actorId, operatorIdentity: identity },
    }

    await assert.rejects(
      () => command.execute({ ...base, confirmation: 'DELETE' }),
      /confirmation must be PURGE/
    )
    await assert.rejects(
      () => command.execute({ ...base, confirmation: 'PURGE', batchSize: 1_001 }),
      /batchSize must be between/
    )
    await assert.rejects(
      () => command.execute({ ...base, confirmation: 'PURGE', retentionDays: 0 }),
      /days must be between/
    )
  })

  test('passes the caller transaction to one bounded purge', async ({ assert }) => {
    const identity = await issuedIdentity()
    const transaction = { marker: 'transaction' }
    const calls: Array<Record<string, unknown>> = []
    const command = new PurgeErrorEventRetentionCommand({
      countDue: () => Promise.resolve(0),
      purgeDue: (cutoff, limit, trx) => {
        calls.push({ cutoff, limit, trx })
        return Promise.resolve(17)
      },
    })

    const result = await command.execute(
      {
        now,
        retentionDays: 30,
        batchSize: 25,
        reason: 'scheduled privacy retention',
        confirmation: 'PURGE',
        execution: { userId: actorId, operatorIdentity: identity },
      },
      transaction
    )

    assert.equal(result.purgedCount, 17)
    assert.equal(calls[0]?.['limit'], 25)
    assert.equal(calls[0]?.['trx'], transaction)
  })
})
