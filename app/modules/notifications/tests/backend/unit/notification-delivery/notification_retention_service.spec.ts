import { test } from '@japa/runner'

import { writeNotificationRetentionFailureAuditPreservingPrimary } from '#composition/command_support/notification_retention_audit'
import {
  resolveNotificationRetentionServicePrincipal,
  type NotificationRetentionServicePrincipalIdentity,
} from '#modules/authorization/public_contracts/notification_retention_service_principal'
import {
  PurgeNotificationRetentionCommand,
  type NotificationRetentionExecution,
} from '#modules/notifications/actions/commands/notification-outbox/purge_notification_retention_command'

const now = new Date('2026-07-23T12:00:00.000Z')
const actorId = '019c0028-2ddc-7d42-96e8-918675f98c31'

async function issuedIdentity(): Promise<NotificationRetentionServicePrincipalIdentity> {
  return resolveNotificationRetentionServicePrincipal(actorId, {
    findPrincipal: () =>
      Promise.resolve({
        id: actorId,
        systemRole: 'system_admin',
        status: 'active',
      }),
    hasPermission: () => Promise.resolve(true),
  })
}

async function retentionInput(overrides: { now?: Date; batchSize?: number } = {}): Promise<{
  now?: Date
  batchSize?: number
  reason: string
  confirmation: string
  execution: NotificationRetentionExecution
}> {
  const operatorIdentity = await issuedIdentity()
  return {
    ...overrides,
    reason: 'scheduled notification privacy retention',
    confirmation: 'PURGE',
    execution: { userId: actorId, operatorIdentity },
  }
}

test.group('PurgeNotificationRetentionCommand', () => {
  test('preserves the primary retention failure when failure-audit persistence also fails', async ({
    assert,
  }) => {
    const primary = new Error('retention dependency unavailable')
    const auditFailure = new Error('audit sink unavailable')
    let observedAuditFailure: unknown

    try {
      await writeNotificationRetentionFailureAuditPreservingPrimary(
        primary,
        () => Promise.reject(auditFailure),
        (error) => {
          observedAuditFailure = error
        }
      )
      assert.fail('Expected the primary retention failure')
    } catch (error) {
      assert.strictEqual(error, primary)
    }
    assert.strictEqual(observedAuditFailure, auditFailure)
  })

  test('requires an active authorized environment-bound service principal', async ({ assert }) => {
    await assert.rejects(
      () =>
        resolveNotificationRetentionServicePrincipal(undefined, {
          findPrincipal: () => Promise.resolve(null),
          hasPermission: () => Promise.resolve(true),
        }),
      /NOTIFICATION_RETENTION_SERVICE_PRINCIPAL_ID/
    )
    await assert.rejects(
      () =>
        resolveNotificationRetentionServicePrincipal(actorId, {
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

  test('rejects a forged identity before destructive repository access', async ({ assert }) => {
    let repositoryCalled = false
    const command = new PurgeNotificationRetentionCommand({
      operationalStatus: () => Promise.reject(new Error('not used')),
      retireExpiredProjectionTargets: () => {
        repositoryCalled = true
        return Promise.resolve(0)
      },
      expireCanonicalBatch: () => Promise.resolve(0),
      purgeProcessedOutbox: () => Promise.resolve(0),
      purgeCompletedFanoutJobs: () => Promise.resolve(0),
      tombstonePurgePlan: () => Promise.resolve({ tombstones: [], targets: [] }),
      confirmTombstonePurge: () => Promise.resolve(0),
      retiredProjectionIndexPlan: () => Promise.resolve([]),
      confirmRetiredProjectionIndexDeletion: () => Promise.resolve(false),
      purgeTerminalLedger: () => Promise.resolve(0),
    })

    await assert.rejects(
      () =>
        command.execute({
          now,
          reason: 'scheduled notification privacy retention',
          confirmation: 'PURGE',
          execution: {
            userId: actorId,
            operatorIdentity: {
              actorId,
              actorRoleSurface: 'system_admin',
              actorType: 'service',
              authenticationProvenance: 'runtime_environment',
              configurationKey: 'NOTIFICATION_RETENTION_SERVICE_PRINCIPAL_ID',
            },
          },
        }),
      /trusted notification-retention service-principal binding/
    )
    assert.isFalse(repositoryCalled)
  })

  test('uses independent 30-day work evidence windows and bounded batches', async ({ assert }) => {
    const calls: Array<{ operation: string; before: Date; limit: number }> = []
    const repository = {
      operationalStatus: () =>
        Promise.resolve({
          dueNotifications: 0,
          eligibleProcessedOutbox: 0,
          eligibleCompletedFanoutJobs: 0,
          outboxDeadLetters: 0,
          fanoutDeadLetters: 0,
          tombstonesAwaitingProjectionProof: 0,
          expiredRollbackTargets: 0,
          retiredIndicesAwaitingDeletion: 0,
        }),
      expireCanonicalBatch: (at: Date, limit: number) => {
        calls.push({ operation: 'expire', before: at, limit })
        return Promise.resolve(3)
      },
      purgeProcessedOutbox: (before: Date, limit: number) => {
        calls.push({ operation: 'outbox', before, limit })
        return Promise.resolve(2)
      },
      purgeCompletedFanoutJobs: (before: Date, limit: number) => {
        calls.push({ operation: 'fanout', before, limit })
        return Promise.resolve(1)
      },
      tombstonePurgePlan: () => Promise.resolve({ tombstones: [], targets: [] }),
      confirmTombstonePurge: () => Promise.resolve(0),
      retireExpiredProjectionTargets: () => Promise.resolve(0),
      retiredProjectionIndexPlan: () => Promise.resolve([]),
      confirmRetiredProjectionIndexDeletion: () => Promise.resolve(false),
      purgeTerminalLedger: (before: Date, limit: number) => {
        calls.push({ operation: 'ledger', before, limit })
        return Promise.resolve(4)
      },
    }

    const result = await new PurgeNotificationRetentionCommand(repository).execute(
      await retentionInput({ now, batchSize: 250 })
    )

    assert.deepEqual(result, {
      expiredNotifications: 3,
      purgedProcessedOutbox: 2,
      purgedCompletedFanoutJobs: 1,
      purgedTombstones: 0,
      purgedAcceptanceLedger: 4,
      retiredProjectionTargets: 0,
      purgedRetiredProjectionIndices: 0,
    })
    assert.deepEqual(
      calls.map((call) => ({
        operation: call.operation,
        before: call.before.toISOString(),
        limit: call.limit,
      })),
      [
        { operation: 'expire', before: now.toISOString(), limit: 250 },
        {
          operation: 'outbox',
          before: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1_000).toISOString(),
          limit: 250,
        },
        {
          operation: 'ledger',
          before: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1_000).toISOString(),
          limit: 250,
        },
        {
          operation: 'fanout',
          before: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1_000).toISOString(),
          limit: 250,
        },
      ]
    )
  })

  test('physically deletes tombstones from every retained index before PostgreSQL purge', async ({
    assert,
  }) => {
    const calls: string[] = []
    const repository = {
      operationalStatus: () =>
        Promise.resolve({
          dueNotifications: 0,
          eligibleProcessedOutbox: 0,
          eligibleCompletedFanoutJobs: 0,
          outboxDeadLetters: 0,
          fanoutDeadLetters: 0,
          tombstonesAwaitingProjectionProof: 0,
          expiredRollbackTargets: 0,
          retiredIndicesAwaitingDeletion: 0,
        }),
      expireCanonicalBatch: () => Promise.resolve(0),
      purgeProcessedOutbox: () => Promise.resolve(0),
      purgeCompletedFanoutJobs: () => Promise.resolve(0),
      tombstonePurgePlan: () =>
        Promise.resolve({
          tombstones: [
            { notificationId: 'notification-1', finalRevision: 3 },
            { notificationId: 'notification-2', finalRevision: 4 },
          ],
          targets: [
            { id: 'target-a', physicalIndex: 'notifications-a' },
            { id: 'target-b', physicalIndex: 'notifications-b' },
          ],
        }),
      confirmTombstonePurge: (input: { notificationIds: string[]; targetIds: string[] }) => {
        calls.push(`confirm:${input.targetIds.join(',')}:${input.notificationIds.join(',')}`)
        return Promise.resolve(2)
      },
      retireExpiredProjectionTargets: () => Promise.resolve(0),
      retiredProjectionIndexPlan: () => Promise.resolve([]),
      confirmRetiredProjectionIndexDeletion: () => Promise.resolve(false),
      purgeTerminalLedger: () => Promise.resolve(0),
    }
    const search = {
      purgeMany: (index: string, ids: string[]) => {
        calls.push(`search:${index}:${ids.join(',')}`)
        return Promise.resolve({ appliedIds: ids, failures: [] })
      },
    }

    const result = await new PurgeNotificationRetentionCommand(repository, search).execute(
      await retentionInput({ now, batchSize: 100 })
    )

    assert.equal(result.purgedTombstones, 2)
    assert.deepEqual(calls, [
      'search:notifications-a:notification-1,notification-2',
      'search:notifications-b:notification-1,notification-2',
      'confirm:target-a,target-b:notification-1,notification-2',
    ])
  })

  test('refuses PostgreSQL tombstone confirmation when a search purge result is incomplete', async ({
    assert,
  }) => {
    let confirmCalled = false
    const repository = {
      operationalStatus: () => Promise.reject(new Error('not used')),
      expireCanonicalBatch: () => Promise.resolve(0),
      purgeProcessedOutbox: () => Promise.resolve(0),
      purgeCompletedFanoutJobs: () => Promise.resolve(0),
      tombstonePurgePlan: () =>
        Promise.resolve({
          tombstones: [
            { notificationId: 'notification-1', finalRevision: 3 },
            { notificationId: 'notification-2', finalRevision: 4 },
          ],
          targets: [{ id: 'target-a', physicalIndex: 'notifications-a' }],
        }),
      confirmTombstonePurge: () => {
        confirmCalled = true
        return Promise.resolve(2)
      },
      retireExpiredProjectionTargets: () => Promise.resolve(0),
      retiredProjectionIndexPlan: () => Promise.resolve([]),
      confirmRetiredProjectionIndexDeletion: () => Promise.resolve(false),
      purgeTerminalLedger: () => Promise.resolve(0),
    }
    const command = new PurgeNotificationRetentionCommand(repository, {
      purgeMany: () =>
        Promise.resolve({
          appliedIds: ['notification-1'],
          failures: [],
        }),
    })
    const input = await retentionInput({ now })

    await assert.rejects(
      () => command.execute(input),
      /notification_tombstone_purge_failed:incomplete_purge_result/
    )
    assert.isFalse(confirmCalled)
  })

  test('retires expired rollback targets and deletes only alias-free physical indices', async ({
    assert,
  }) => {
    const calls: string[] = []
    const repository = {
      operationalStatus: () =>
        Promise.resolve({
          dueNotifications: 0,
          eligibleProcessedOutbox: 0,
          eligibleCompletedFanoutJobs: 0,
          outboxDeadLetters: 0,
          fanoutDeadLetters: 0,
          tombstonesAwaitingProjectionProof: 0,
          expiredRollbackTargets: 0,
          retiredIndicesAwaitingDeletion: 0,
        }),
      expireCanonicalBatch: () => Promise.resolve(0),
      purgeProcessedOutbox: () => Promise.resolve(0),
      purgeCompletedFanoutJobs: () => Promise.resolve(0),
      tombstonePurgePlan: () => Promise.resolve({ tombstones: [], targets: [] }),
      confirmTombstonePurge: () => Promise.resolve(0),
      retireExpiredProjectionTargets: () => Promise.resolve(1),
      retiredProjectionIndexPlan: () =>
        Promise.resolve([
          {
            id: 'target-retired',
            physicalIndex: 'suar_notifications_feed_v000001',
          },
        ]),
      confirmRetiredProjectionIndexDeletion: (input: {
        targetId: string
        physicalIndex: string
      }) => {
        calls.push(`confirm:${input.targetId}:${input.physicalIndex}`)
        return Promise.resolve(true)
      },
      purgeTerminalLedger: () => Promise.resolve(0),
    }
    const search = {
      purgeMany: (_index: string, ids: string[]) =>
        Promise.resolve({ appliedIds: ids, failures: [] }),
    }
    const lifecycle = {
      aliasIndices: (alias: string) => {
        calls.push(`alias:${alias}`)
        return Promise.resolve(['suar_notifications_feed_v000002'])
      },
      deletePhysicalIndex: (index: string) => {
        calls.push(`delete:${index}`)
        return Promise.resolve()
      },
    }

    const result = await new PurgeNotificationRetentionCommand(
      repository,
      search,
      lifecycle
    ).execute(await retentionInput({ now, batchSize: 100 }))

    assert.equal(result.retiredProjectionTargets, 1)
    assert.equal(result.purgedRetiredProjectionIndices, 1)
    assert.deepEqual(calls, [
      'alias:suar_notifications_read',
      'alias:suar_notifications_write',
      'delete:suar_notifications_feed_v000001',
      'confirm:target-retired:suar_notifications_feed_v000001',
    ])
  })

  test('retries idempotently after the physical index was deleted but PostgreSQL confirmation failed', async ({
    assert,
  }) => {
    let confirmationAttempts = 0
    let deleteAttempts = 0
    let pending = true
    const repository = {
      operationalStatus: () => Promise.reject(new Error('not used')),
      expireCanonicalBatch: () => Promise.resolve(0),
      purgeProcessedOutbox: () => Promise.resolve(0),
      purgeCompletedFanoutJobs: () => Promise.resolve(0),
      tombstonePurgePlan: () => Promise.resolve({ tombstones: [], targets: [] }),
      confirmTombstonePurge: () => Promise.resolve(0),
      retireExpiredProjectionTargets: () => Promise.resolve(0),
      retiredProjectionIndexPlan: () =>
        Promise.resolve(
          pending
            ? [
                {
                  id: 'target-retired',
                  physicalIndex: 'suar_notifications_feed_v000001',
                },
              ]
            : []
        ),
      confirmRetiredProjectionIndexDeletion: () => {
        confirmationAttempts += 1
        if (confirmationAttempts === 1) {
          return Promise.reject(new Error('postgres confirmation unavailable'))
        }
        pending = false
        return Promise.resolve(true)
      },
      purgeTerminalLedger: () => Promise.resolve(0),
    }
    const lifecycle = {
      aliasIndices: () => Promise.resolve([]),
      deletePhysicalIndex: () => {
        deleteAttempts += 1
        // The second call models the official Elasticsearch 404 response, which
        // the production adapter treats as an idempotent successful deletion.
        return Promise.resolve()
      },
    }
    const command = new PurgeNotificationRetentionCommand(
      repository,
      {
        purgeMany: (_index: string, ids: string[]) =>
          Promise.resolve({ appliedIds: ids, failures: [] }),
      },
      lifecycle
    )
    const firstAttemptInput = await retentionInput({ now })

    await assert.rejects(
      () => command.execute(firstAttemptInput),
      /postgres confirmation unavailable/
    )
    const recovered = await command.execute(await retentionInput({ now }))

    assert.equal(recovered.purgedRetiredProjectionIndices, 1)
    assert.equal(deleteAttempts, 2)
    assert.equal(confirmationAttempts, 2)
  })

  test('refuses to delete a retired physical index that still owns a live alias', async ({
    assert,
  }) => {
    const repository = {
      operationalStatus: () =>
        Promise.resolve({
          dueNotifications: 0,
          eligibleProcessedOutbox: 0,
          eligibleCompletedFanoutJobs: 0,
          outboxDeadLetters: 0,
          fanoutDeadLetters: 0,
          tombstonesAwaitingProjectionProof: 0,
          expiredRollbackTargets: 0,
          retiredIndicesAwaitingDeletion: 1,
        }),
      expireCanonicalBatch: () => Promise.resolve(0),
      purgeProcessedOutbox: () => Promise.resolve(0),
      purgeCompletedFanoutJobs: () => Promise.resolve(0),
      tombstonePurgePlan: () => Promise.resolve({ tombstones: [], targets: [] }),
      confirmTombstonePurge: () => Promise.resolve(0),
      retireExpiredProjectionTargets: () => Promise.resolve(0),
      retiredProjectionIndexPlan: () =>
        Promise.resolve([
          {
            id: 'target-retired',
            physicalIndex: 'suar_notifications_feed_v000001',
          },
        ]),
      confirmRetiredProjectionIndexDeletion: () => Promise.resolve(true),
      purgeTerminalLedger: () => Promise.resolve(0),
    }
    const lifecycle = {
      aliasIndices: (alias: string) =>
        Promise.resolve(
          alias === 'suar_notifications_read' ? ['suar_notifications_feed_v000001'] : []
        ),
      deletePhysicalIndex: () => Promise.reject(new Error('must not delete')),
    }

    const input = await retentionInput({ now })
    await assert.rejects(
      () =>
        new PurgeNotificationRetentionCommand(
          repository,
          {
            purgeMany: (_index: string, ids: string[]) =>
              Promise.resolve({ appliedIds: ids, failures: [] }),
          },
          lifecycle
        ).execute(input),
      /notification_retired_index_still_aliased/
    )
  })

  test('requires bounded parameters, a reason, and explicit destructive confirmation', async ({
    assert,
  }) => {
    const input = await retentionInput({ now, batchSize: 1_001 })
    await assert.rejects(
      () => new PurgeNotificationRetentionCommand().execute(input),
      /between 1 and 1000/
    )
    await assert.rejects(
      () =>
        new PurgeNotificationRetentionCommand().execute({
          ...input,
          batchSize: 100,
          reason: 'short',
        }),
      /reason must contain 10 to 500/
    )
    await assert.rejects(
      () =>
        new PurgeNotificationRetentionCommand().execute({
          ...input,
          batchSize: 100,
          confirmation: 'DELETE',
        }),
      /confirmation must be PURGE/
    )
  })
})
