import db from '@adonisjs/lucid/services/db'
import { test } from '@japa/runner'

import { notificationApplication as notificationPublicApi } from '#composition/notification_composition'
import { makeRebuildNotificationProjectionCommand } from '#composition/notification_projection_composition'
import { PromoteNotificationProjectionCommand } from '#modules/notifications/actions/commands/promote_notification_projection_command'
import { RebuildNotificationProjectionCommand } from '#modules/notifications/actions/commands/rebuild_notification_projection_command'
import { RollbackNotificationProjectionCommand } from '#modules/notifications/actions/commands/rollback_notification_projection_command'
import type { NotificationProjectionRun } from '#modules/notifications/domain/notification_projection_lifecycle'
import {
  DEFAULT_NOTIFICATION_PHYSICAL_INDEX,
  DEFAULT_NOTIFICATION_READ_ALIAS,
  DEFAULT_NOTIFICATION_WRITE_ALIAS,
} from '#modules/notifications/infra/repositories/postgres_notification_projection_delivery_repository'
import { PostgresNotificationProjectionOperationsRepository } from '#modules/notifications/infra/repositories/postgres_notification_projection_operations_repository'
import type { NotificationSearchDocument } from '#modules/notifications/infra/search/notification_search_index_repository'
import { BACKEND_NOTIFICATION_TYPES } from '#modules/notifications/public_contracts/notification_constants'
import { setupApp, teardownApp } from '#tests/helpers/bootstrap'
import { UserFactory, cleanupTestData } from '#tests/helpers/factories'

const projectionAliases = {
  readAlias: DEFAULT_NOTIFICATION_READ_ALIAS,
  writeAlias: DEFAULT_NOTIFICATION_WRITE_ALIAS,
}

test.group('Integration | Notification Projection Rebuild', (group) => {
  group.setup(async () => {
    await setupApp()
  })
  group.teardown(() => teardownApp())
  group.each.teardown(async () => {
    await db.from('notification_projection_runs').delete()
    await db.from('notification_projection_deliveries').delete()
    await db.from('notification_projection_targets').delete()
    await cleanupTestData()
  })

  test('dry-run is read-only and reports the bounded rebuild plan', async ({ assert }) => {
    const actor = await UserFactory.create({ username: 'notification_rebuild_dry_run' })
    const command = makeRebuildNotificationProjectionCommand()

    const result = await command.execute({
      actorId: actor.id,
      reason: 'Validate notification projection capacity before execution',
      dryRun: true,
      batchSize: 100,
    })

    assert.equal(result.status, 'dry_run')
    if (result.status !== 'dry_run') {
      throw new Error('Expected dry-run result')
    }
    assert.match(result.plan.targetIndex, /notifications_feed_v\d{6}$/u)
    const count = (await db.from('notification_projection_runs').count('* as count').first()) as {
      count: number | string
    }
    assert.equal(Number(count.count), 0)
  })

  test('prepares a reconciled target and requires explicit promotion before alias cutover', async ({
    assert,
  }) => {
    const operationNow = new Date()
    const actor = await UserFactory.create({ username: 'notification_rebuild_operator' })
    const accepted = await notificationPublicApi.handle({
      user_id: actor.id,
      title: 'Rebuild source',
      message: 'Must be present in the new projection',
      type: BACKEND_NOTIFICATION_TYPES.INFO,
    })
    if (!accepted) {
      throw new Error('Expected canonical notification')
    }

    const projected = new Map<string, NotificationSearchDocument>()
    const aliasTargets = {
      [DEFAULT_NOTIFICATION_READ_ALIAS]: DEFAULT_NOTIFICATION_PHYSICAL_INDEX,
      [DEFAULT_NOTIFICATION_WRITE_ALIAS]: DEFAULT_NOTIFICATION_PHYSICAL_INDEX,
    }
    const aliasSwaps: unknown[] = []
    let reconciliationPasses = true
    const operations = new PostgresNotificationProjectionOperationsRepository()
    const admin = {
      ensurePhysicalIndex: () => Promise.resolve(),
      refresh: () => Promise.resolve(),
      aliasIndices: (alias: string) => Promise.resolve([aliasTargets[alias] ?? 'missing']),
      swapAliases: (input: {
        sourceIndex: string
        targetIndex: string
        readAlias: string
        writeAlias: string
      }) => {
        aliasSwaps.push(input)
        aliasTargets[DEFAULT_NOTIFICATION_READ_ALIAS] = input.targetIndex
        aliasTargets[DEFAULT_NOTIFICATION_WRITE_ALIAS] = input.targetIndex
        return Promise.resolve()
      },
    }
    const dependencies = {
      operations,
      admin,
      writer: {
        projectMany: (_index: string, documents: NotificationSearchDocument[]) => {
          for (const document of documents) {
            projected.set(document.notificationId, document)
          }
          return Promise.resolve({
            appliedIds: documents.map((document) => document.notificationId),
            staleIds: [],
            failures: [],
          })
        },
        purgeMany: () => Promise.resolve({ appliedIds: [], failures: [] }),
      },
      reconciler: {
        reconcile: async (run: NotificationProjectionRun) => {
          await operations.recordReconciliation({
            runId: run.id,
            missing: 0,
            stale: 0,
            extra: 0,
            report: {},
            passed: reconciliationPasses,
          })
          return {
            missing: reconciliationPasses ? 0 : 1,
            stale: 0,
            extra: 0,
            ahead: 0,
            repaired: 0,
            passed: reconciliationPasses,
            samples: {
              missing: reconciliationPasses ? [] : [accepted.id],
              stale: [],
              extra: [],
              ahead: [],
            },
          }
        },
      },
    }
    const rebuildCommand = new RebuildNotificationProjectionCommand(dependencies)
    const promoteCommand = new PromoteNotificationProjectionCommand({
      ...dependencies,
      aliases: projectionAliases,
      rollbackWindowMs: 60 * 60 * 1_000,
      now: () => operationNow,
    })

    const prepared = await rebuildCommand.execute({
      actorId: actor.id,
      reason: 'Prepare verified notification projection rebuild for promotion',
      dryRun: false,
      batchSize: 100,
    })

    assert.equal(prepared.status, 'ready_for_promotion')
    assert.isTrue(projected.has(accepted.id))
    assert.lengthOf(aliasSwaps, 0)
    if (prepared.status !== 'ready_for_promotion') {
      throw new Error('Expected target to require explicit promotion')
    }

    const promotionInput = {
      runId: prepared.run.id,
      actorId: actor.id,
      reason: 'Change approval CR-2026-0724 authorized notification alias promotion',
      expectedTargetIndex: prepared.run.targetIndex,
    }
    reconciliationPasses = false
    await assert.rejects(
      () => promoteCommand.execute(promotionInput),
      /notification_projection_promotion_reconciliation_failed/
    )
    assert.lengthOf(aliasSwaps, 0)

    reconciliationPasses = true
    const revalidated = await rebuildCommand.execute({
      actorId: actor.id,
      reason: 'Revalidate notification projection after a blocked promotion',
      dryRun: false,
      batchSize: 100,
    })
    assert.equal(revalidated.status, 'ready_for_promotion')
    const result = await promoteCommand.execute(promotionInput)

    assert.equal(result.status, 'completed')
    assert.lengthOf(aliasSwaps, 1)
    const targets = (await db
      .from('notification_projection_targets')
      .select(
        'id',
        'physical_index',
        'status',
        'required_until',
        'rollback_eligible',
        'checkpoint_sequence'
      )
      .orderBy('created_at', 'asc')) as Array<{
      id: string
      physical_index: string
      status: string
      required_until: Date | null
      rollback_eligible: boolean
      checkpoint_sequence: number | string
    }>
    assert.deepEqual(targets.map((target) => target.status).sort(), ['primary', 'rollback'])
    const rollback = targets.find((target) => target.status === 'rollback')
    assert.isNotNull(rollback?.required_until)
    assert.isTrue(rollback?.rollback_eligible)

    const run = (await db
      .from('notification_projection_runs')
      .select('promotion_requested_by', 'promotion_reason')
      .where('id', prepared.run.id)
      .first()) as
      | {
          promotion_requested_by: string | null
          promotion_reason: string | null
        }
      | undefined
    assert.equal(run?.promotion_requested_by, actor.id)
    assert.equal(
      run?.promotion_reason,
      'Change approval CR-2026-0724 authorized notification alias promotion'
    )
    const alternatePromotionOperator = await UserFactory.create({
      username: 'notification_rebuild_alternate_promoter',
    })
    await assert.rejects(
      () =>
        promoteCommand.execute({
          ...promotionInput,
          actorId: alternatePromotionOperator.id,
          reason: 'A different operator cannot reuse completed promotion approval evidence',
        }),
      /notification_projection_completed_approval_mismatch/
    )
    assert.lengthOf(aliasSwaps, 1)

    const primary = targets.find((target) => target.status === 'primary')
    if (!primary || !rollback) {
      throw new Error('Expected primary and rollback projection targets')
    }
    await db
      .from('notification_projection_targets')
      .where('id', rollback.id)
      .update({ checkpoint_sequence: primary.checkpoint_sequence })
    await db.rawQuery(
      `
        INSERT INTO notification_projection_deliveries (
          outbox_id,
          target_id,
          status,
          attempt_count,
          available_at,
          applied_revision,
          processed_at
        )
        SELECT
          outbox.id,
          ?::uuid,
          'processed',
          1,
          ?::timestamptz,
          outbox.projection_revision,
          ?::timestamptz
        FROM notification_outbox AS outbox
        WHERE outbox.destination = 'feed_search'
          AND outbox.sequence <= ?
        ON CONFLICT (outbox_id, target_id)
        DO UPDATE SET
          status = 'processed',
          applied_revision = EXCLUDED.applied_revision,
          processed_at = EXCLUDED.processed_at
      `,
      [
        rollback.id,
        new Date(operationNow.getTime() + 4 * 60 * 1_000),
        new Date(operationNow.getTime() + 4 * 60 * 1_000),
        Number(primary.checkpoint_sequence),
      ]
    )

    const rollbackResult = await new RollbackNotificationProjectionCommand({
      operations,
      admin,
      aliases: projectionAliases,
      now: () => new Date(operationNow.getTime() + 5 * 60 * 1_000),
    }).execute({
      actorId: actor.id,
      reason: 'Incident INC-2026-0724 requires verified notification index rollback',
      expectedCurrentIndex: primary.physical_index,
      rollbackTargetIndex: rollback.physical_index,
    })

    assert.equal(rollbackResult.status, 'completed')
    assert.lengthOf(aliasSwaps, 2)
    assert.equal(aliasTargets[DEFAULT_NOTIFICATION_READ_ALIAS], rollback.physical_index)
    assert.equal(aliasTargets[DEFAULT_NOTIFICATION_WRITE_ALIAS], rollback.physical_index)
    const rolledBackTarget = (await db
      .from('notification_projection_targets')
      .select('status', 'rollback_requested_by', 'rollback_reason', 'rolled_back_at')
      .where('id', rollback.id)
      .first()) as
      | {
          status: string
          rollback_requested_by: string | null
          rollback_reason: string | null
          rolled_back_at: Date | null
        }
      | undefined
    assert.equal(rolledBackTarget?.status, 'primary')
    assert.equal(rolledBackTarget?.rollback_requested_by, actor.id)
    assert.equal(
      rolledBackTarget?.rollback_reason,
      'Incident INC-2026-0724 requires verified notification index rollback'
    )
    assert.isNotNull(rolledBackTarget?.rolled_back_at)

    const otherOperator = await UserFactory.create({
      username: 'notification_rebuild_other_operator',
    })
    await assert.rejects(
      () =>
        new RollbackNotificationProjectionCommand({
          operations,
          admin,
          aliases: projectionAliases,
          now: () => new Date(operationNow.getTime() + 5 * 60 * 1_000),
        }).execute({
          actorId: otherOperator.id,
          reason: 'A different operator must not rewrite rollback approval evidence',
          expectedCurrentIndex: primary.physical_index,
          rollbackTargetIndex: rollback.physical_index,
        }),
      /notification_projection_rollback_approval_conflict/
    )

    await assert.rejects(
      () => promoteCommand.execute(promotionInput),
      /notification_projection_completed_primary_mismatch/
    )
    assert.lengthOf(aliasSwaps, 2)
    assert.equal(aliasTargets[DEFAULT_NOTIFICATION_READ_ALIAS], rollback.physical_index)
    assert.equal(aliasTargets[DEFAULT_NOTIFICATION_WRITE_ALIAS], rollback.physical_index)
  })
})
