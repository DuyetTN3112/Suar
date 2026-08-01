import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  NotificationProjectionRebuildResult,
  NotificationProjectionReconciliationReport,
} from '#modules/notifications/actions/dtos/notification_projection_lifecycle'
import type { NotificationProjectionReconciler } from '#modules/notifications/actions/ports/outbound/notification_projection_reconciler'
import type {
  NotificationProjectionBatchResult,
  NotificationProjectionIndexAdministration,
  NotificationProjectionWriter,
} from '#modules/notifications/actions/ports/outbound/notification_projection_writer'
import {
  toActiveNotificationSearchDocument,
  toNotificationTombstoneSearchDocument,
  type CanonicalNotificationProjectionRow,
  type NotificationTombstoneProjectionRow,
} from '#modules/notifications/domain/notification_projection_document'
import type {
  NotificationProjectionCatchupState,
  NotificationProjectionPlan,
  NotificationProjectionRun,
} from '#modules/notifications/domain/notification_projection_lifecycle'

interface NotificationProjectionRebuildOperations {
  plan(): Promise<NotificationProjectionPlan>
  activeRun(): Promise<NotificationProjectionRun | null>
  initialize(input: {
    actorId: string
    reason: string
    targetIndex: string
    targetKey: string
  }): Promise<NotificationProjectionRun>
  reload(runId: string): Promise<NotificationProjectionRun>
  setStatus(
    runId: string,
    status: 'backfilling' | 'catching_up' | 'reconciling' | 'ready'
  ): Promise<void>
  activeBatch(afterId: string | null, limit: number): Promise<CanonicalNotificationProjectionRow[]>
  tombstoneBatch(
    afterId: string | null,
    limit: number
  ): Promise<NotificationTombstoneProjectionRow[]>
  recordBackfillBatch(input: {
    runId: string
    kind: 'notification' | 'tombstone'
    lastId: string
    count: number
  }): Promise<void>
  completeBackfill(run: NotificationProjectionRun): Promise<void>
  captureS1(runId: string): Promise<number>
  catchupState(
    run: NotificationProjectionRun,
    s1: number
  ): Promise<NotificationProjectionCatchupState>
}

interface RebuildNotificationProjectionCommandOptions {
  operations: NotificationProjectionRebuildOperations
  admin: Pick<NotificationProjectionIndexAdministration, 'ensurePhysicalIndex' | 'refresh'>
  writer: NotificationProjectionWriter
  reconciler: NotificationProjectionReconciler
}

function validateBatchSize(value: number): number {
  if (!Number.isSafeInteger(value) || value < 10 || value > 500) {
    throw new RangeError('Notification projection rebuild batch size must be between 10 and 500')
  }
  return value
}

function assertProjectionSucceeded(result: NotificationProjectionBatchResult): void {
  if (result.failures.length > 0) {
    const first = result.failures[0]
    throw new InvariantViolationException(
      `notification_projection_backfill_failed:${first?.errorClass ?? 'unknown'}`
    )
  }
}

export class RebuildNotificationProjectionCommand {
  private readonly operations: NotificationProjectionRebuildOperations
  private readonly admin: Pick<
    NotificationProjectionIndexAdministration,
    'ensurePhysicalIndex' | 'refresh'
  >
  private readonly writer: NotificationProjectionWriter
  private readonly reconciler: NotificationProjectionReconciler

  constructor(options: RebuildNotificationProjectionCommandOptions) {
    this.operations = options.operations
    this.admin = options.admin
    this.writer = options.writer
    this.reconciler = options.reconciler
  }

  async execute(input: {
    actorId: string
    reason: string
    dryRun: boolean
    batchSize?: number
  }): Promise<NotificationProjectionRebuildResult> {
    const reason = input.reason.trim()
    if (reason.length < 10 || reason.length > 500) {
      throw new RangeError('Projection rebuild reason must contain 10 to 500 characters')
    }
    const batchSize = validateBatchSize(input.batchSize ?? 500)
    const plan = await this.operations.plan()
    if (input.dryRun) {
      return { status: 'dry_run', plan }
    }

    let run = await this.operations.activeRun()
    if (!run) {
      run = await this.operations.initialize({
        actorId: input.actorId,
        reason,
        targetIndex: plan.targetIndex,
        targetKey: plan.targetKey,
      })
    }
    await this.admin.ensurePhysicalIndex(run.targetIndex)

    if (run.status === 'initialized' || run.status === 'backfilling') {
      await this.backfill(run, batchSize)
      run = await this.operations.reload(run.id)
    }

    let reconciliation: NotificationProjectionReconciliationReport | null = null
    if (run.status === 'catching_up' || run.status === 'reconciling' || run.status === 'ready') {
      const s1 = await this.operations.captureS1(run.id)
      run = await this.operations.reload(run.id)
      const catchup = await this.operations.catchupState(run, s1)
      if (!catchup.caughtUp) {
        return {
          status: 'waiting_for_catchup',
          run,
          catchup,
        }
      }

      reconciliation = await this.reconciler.reconcile(run, { repair: true })
      if (!reconciliation.passed && reconciliation.repaired > 0) {
        reconciliation = await this.reconciler.reconcile(run, { repair: false })
      }
      if (!reconciliation.passed) {
        return {
          status: 'reconciliation_blocked',
          run: await this.operations.reload(run.id),
          reconciliation,
        }
      }
      run = await this.operations.reload(run.id)
    }

    if (run.status !== 'ready' && run.status !== 'cutting_over') {
      throw new InvariantViolationException(
        `notification_projection_rebuild_unhandled_state:${run.status}`
      )
    }
    return {
      status: 'ready_for_promotion',
      run,
      reconciliation,
    }
  }

  private async backfill(run: NotificationProjectionRun, batchSize: number): Promise<void> {
    await this.operations.setStatus(run.id, 'backfilling')
    let notificationCursor = run.lastNotificationId
    for (;;) {
      const rows = await this.operations.activeBatch(notificationCursor, batchSize)
      if (rows.length === 0) {
        break
      }
      const documents = rows.map(toActiveNotificationSearchDocument)
      assertProjectionSucceeded(await this.writer.projectMany(run.targetIndex, documents))
      notificationCursor = rows.at(-1)?.id ?? null
      if (!notificationCursor) {
        throw new InvariantViolationException(
          'Notification projection active backfill lost its keyset cursor'
        )
      }
      await this.operations.recordBackfillBatch({
        runId: run.id,
        kind: 'notification',
        lastId: notificationCursor,
        count: rows.length,
      })
    }

    let tombstoneCursor = run.lastTombstoneId
    for (;;) {
      const rows = await this.operations.tombstoneBatch(tombstoneCursor, batchSize)
      if (rows.length === 0) {
        break
      }
      const documents = rows.map(toNotificationTombstoneSearchDocument)
      assertProjectionSucceeded(await this.writer.projectMany(run.targetIndex, documents))
      tombstoneCursor = rows.at(-1)?.notification_id ?? null
      if (!tombstoneCursor) {
        throw new InvariantViolationException(
          'Notification projection tombstone backfill lost its keyset cursor'
        )
      }
      await this.operations.recordBackfillBatch({
        runId: run.id,
        kind: 'tombstone',
        lastId: tombstoneCursor,
        count: rows.length,
      })
    }

    await this.admin.refresh(run.targetIndex)
    await this.operations.completeBackfill(run)
  }
}
