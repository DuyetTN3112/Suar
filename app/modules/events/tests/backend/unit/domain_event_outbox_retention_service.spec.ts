import { test } from '@japa/runner'

import { writeDomainEventOutboxRetentionFailureAuditPreservingPrimary } from '#composition/command_support/domain_event_outbox_retention_audit'
import {
  resolveDomainEventOutboxRetentionServicePrincipal,
  type DomainEventOutboxRetentionPrincipalIdentity,
} from '#modules/authorization/public_contracts/domain_event_outbox_retention_service_principal'
import { PurgeDomainEventOutboxRetentionCommand } from '#modules/events/actions/commands/purge_domain_event_outbox_retention_command'
import { type DomainEventOutboxRetentionExecution } from '#modules/events/actions/dtos/domain_event_outbox_retention'
import { PreviewDomainEventOutboxRetentionQuery } from '#modules/events/actions/queries/preview_domain_event_outbox_retention_query'
import { DOMAIN_EVENT_OUTBOX_RETENTION_COUNT_CAP } from '#modules/events/domain/domain_event_outbox_retention_policy'

const actorId = '019c0028-2ddc-7d42-96e8-918675f98c31'
const now = new Date('2026-07-26T12:00:00.000Z')
const DAY_MS = 24 * 60 * 60 * 1_000

async function issuedIdentity(): Promise<DomainEventOutboxRetentionPrincipalIdentity> {
  return resolveDomainEventOutboxRetentionServicePrincipal(actorId, {
    findPrincipal: () =>
      Promise.resolve({
        id: actorId,
        systemRole: 'system_admin',
        status: 'active',
      }),
    hasPermission: () => Promise.resolve(true),
  })
}

async function execution(): Promise<DomainEventOutboxRetentionExecution> {
  return {
    userId: actorId,
    operatorIdentity: await issuedIdentity(),
  }
}

test.group('Domain event outbox retention use cases', () => {
  test('requires an active authorized environment-bound service principal', async ({ assert }) => {
    await assert.rejects(
      () =>
        resolveDomainEventOutboxRetentionServicePrincipal(undefined, {
          findPrincipal: () => Promise.resolve(null),
          hasPermission: () => Promise.resolve(true),
        }),
      /DOMAIN_EVENT_OUTBOX_RETENTION_SERVICE_PRINCIPAL_ID/
    )
    await assert.rejects(
      () =>
        resolveDomainEventOutboxRetentionServicePrincipal(actorId, {
          findPrincipal: () =>
            Promise.resolve({
              id: actorId,
              systemRole: 'registered_user',
              status: 'active',
            }),
          hasPermission: () => Promise.resolve(false),
        }),
      /inactive or unauthorized/
    )
  })

  test('rejects a forged identity before repository access', async ({ assert }) => {
    let repositoryCalled = false
    const query = new PreviewDomainEventOutboxRetentionQuery({
      countDue: () => {
        repositoryCalled = true
        return Promise.resolve({ processedRows: 0, replayHistoryRows: 0 })
      },
      purgeProcessed: () => Promise.resolve(0),
      purgeReplayHistory: () => Promise.resolve(0),
    })

    await assert.rejects(
      () =>
        query.execute({
          now,
          processedRetentionDays: 30,
          replayHistoryRetentionDays: 365,
          execution: {
            userId: actorId,
            operatorIdentity: {
              actorId,
              actorRoleSurface: 'system_admin',
              actorType: 'service',
              authenticationProvenance: 'runtime_environment',
              configurationKey: 'DOMAIN_EVENT_OUTBOX_RETENTION_SERVICE_PRINCIPAL_ID',
            },
          },
        }),
      /trusted domain-event outbox retention service-principal binding/
    )
    assert.isFalse(repositoryCalled)
  })

  test('returns bounded preview counts and deterministic independent cutoffs', async ({
    assert,
  }) => {
    const calls: Array<Record<string, unknown>> = []
    const query = new PreviewDomainEventOutboxRetentionQuery({
      countDue: (input) => {
        calls.push(input)
        return Promise.resolve({
          processedRows: DOMAIN_EVENT_OUTBOX_RETENTION_COUNT_CAP,
          replayHistoryRows: 7,
        })
      },
      purgeProcessed: () => Promise.resolve(0),
      purgeReplayHistory: () => Promise.resolve(0),
    })

    const preview = await query.execute({
      now,
      processedRetentionDays: 30,
      replayHistoryRetentionDays: 365,
      execution: await execution(),
    })

    assert.equal(
      preview.processedBefore.toISOString(),
      new Date(now.getTime() - 30 * DAY_MS).toISOString()
    )
    assert.equal(
      preview.replayHistoryBefore.toISOString(),
      new Date(now.getTime() - 365 * DAY_MS).toISOString()
    )
    assert.equal(preview.dueProcessedRows, DOMAIN_EVENT_OUTBOX_RETENTION_COUNT_CAP - 1)
    assert.equal(preview.dueReplayHistoryRows, 7)
    assert.isTrue(preview.processedCountCapped)
    assert.isFalse(preview.replayHistoryCountCapped)
    assert.equal(calls[0]?.['cap'], DOMAIN_EVENT_OUTBOX_RETENTION_COUNT_CAP)
  })

  test('purges both categories through the caller transaction with bounded parameters', async ({
    assert,
  }) => {
    const transaction = { marker: 'retention-transaction' }
    const calls: Array<Record<string, unknown>> = []
    const command = new PurgeDomainEventOutboxRetentionCommand({
      countDue: () => Promise.resolve({ processedRows: 0, replayHistoryRows: 0 }),
      purgeProcessed: (before, limit, trx) => {
        calls.push({ operation: 'processed', before, limit, trx })
        return Promise.resolve(3)
      },
      purgeReplayHistory: (before, limit, trx) => {
        calls.push({ operation: 'history', before, limit, trx })
        return Promise.resolve(2)
      },
    })

    const result = await command.execute(
      {
        now,
        processedRetentionDays: 30,
        replayHistoryRetentionDays: 365,
        batchSize: 250,
        reason: 'scheduled privacy retention',
        confirmation: 'PURGE',
        execution: await execution(),
      },
      transaction
    )

    assert.equal(result.purgedProcessedRows, 3)
    assert.equal(result.purgedReplayHistoryRows, 2)
    assert.deepEqual(
      calls.map((call) => ({
        operation: call['operation'],
        limit: call['limit'],
        trx: call['trx'],
      })),
      [
        { operation: 'processed', limit: 250, trx: transaction },
        { operation: 'history', limit: 250, trx: transaction },
      ]
    )
  })

  test('validates retention relationships and destructive confirmation before purge', async ({
    assert,
  }) => {
    const command = new PurgeDomainEventOutboxRetentionCommand({
      countDue: () => Promise.resolve({ processedRows: 0, replayHistoryRows: 0 }),
      purgeProcessed: () => Promise.resolve(0),
      purgeReplayHistory: () => Promise.resolve(0),
    })
    const base = {
      now,
      processedRetentionDays: 30,
      replayHistoryRetentionDays: 365,
      batchSize: 100,
      reason: 'scheduled privacy retention',
      confirmation: 'PURGE',
      execution: await execution(),
    }
    const transaction = {}

    await assert.rejects(
      () => command.execute({ ...base, replayHistoryRetentionDays: 29 }, transaction),
      /greater than or equal/
    )
    await assert.rejects(
      () => command.execute({ ...base, batchSize: 1_001 }, transaction),
      /batchSize must be between/
    )
    await assert.rejects(
      () => command.execute({ ...base, confirmation: 'DELETE' }, transaction),
      /confirmation must be PURGE/
    )
  })

  test('preserves the primary purge error when failure-audit persistence also fails', async ({
    assert,
  }) => {
    const primary = new Error('retention purge unavailable')
    const auditFailure = new Error('audit persistence unavailable')
    let observedAuditFailure: unknown

    try {
      await writeDomainEventOutboxRetentionFailureAuditPreservingPrimary(
        primary,
        () => Promise.reject(auditFailure),
        (error) => {
          observedAuditFailure = error
        }
      )
      assert.fail('Expected the primary purge error')
    } catch (error) {
      assert.strictEqual(error, primary)
    }
    assert.strictEqual(observedAuditFailure, auditFailure)
  })
})
