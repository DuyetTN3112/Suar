import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type {
  NotificationProjectionPromotionResult,
} from '#modules/notifications/actions/dtos/notification_projection_lifecycle'
import type { NotificationProjectionReconciler } from '#modules/notifications/actions/ports/outbound/notification_projection_reconciler'
import type {
  NotificationProjectionAliases,
  NotificationProjectionIndexAdministration,
} from '#modules/notifications/actions/ports/outbound/notification_projection_writer'
import type {
  NotificationProjectionCatchupState,
  NotificationProjectionRun,
} from '#modules/notifications/domain/notification_projection_lifecycle'

interface NotificationProjectionPromotionOperations {
  reload(runId: string): Promise<NotificationProjectionRun>
  assertCompletedPromotion(input: {
    runId: string
    targetId: string
    actorId: string
    reason: string
  }): Promise<void>
  captureS1(runId: string): Promise<number>
  catchupState(
    run: NotificationProjectionRun,
    s1: number
  ): Promise<NotificationProjectionCatchupState>
  beginCutover(input: {
    runId: string
    actorId: string
    reason: string
    requestedAt: Date
  }): Promise<void>
  finalizeCutover(
    run: NotificationProjectionRun,
    rollbackUntil: Date,
    cutover: () => Promise<void>
  ): Promise<void>
}

interface PromoteNotificationProjectionCommandOptions {
  operations: NotificationProjectionPromotionOperations
  admin: Pick<NotificationProjectionIndexAdministration, 'aliasIndices' | 'swapAliases'>
  reconciler: NotificationProjectionReconciler
  aliases: NotificationProjectionAliases
  rollbackWindowMs: number
  now?: () => Date
}

function aliasState(
  indices: string[],
  sourceIndex: string,
  targetIndex: string
): 'source' | 'target' | 'invalid' {
  if (indices.length === 1 && indices[0] === sourceIndex) {
    return 'source'
  }
  if (indices.length === 1 && indices[0] === targetIndex) {
    return 'target'
  }
  return 'invalid'
}

export class PromoteNotificationProjectionCommand {
  private readonly operations: NotificationProjectionPromotionOperations
  private readonly admin: Pick<
    NotificationProjectionIndexAdministration,
    'aliasIndices' | 'swapAliases'
  >
  private readonly reconciler: NotificationProjectionReconciler
  private readonly aliases: NotificationProjectionAliases
  private readonly now: () => Date
  private readonly rollbackWindowMs: number

  constructor(options: PromoteNotificationProjectionCommandOptions) {
    this.operations = options.operations
    this.admin = options.admin
    this.reconciler = options.reconciler
    this.aliases = options.aliases
    this.now = options.now ?? (() => new Date())
    this.rollbackWindowMs = options.rollbackWindowMs
  }

  async execute(input: {
    runId: string
    actorId: string
    reason: string
    expectedTargetIndex: string
  }): Promise<NotificationProjectionPromotionResult> {
    const reason = input.reason.trim()
    if (reason.length < 10 || reason.length > 500) {
      throw new RangeError('Projection promotion reason must contain 10 to 500 characters')
    }
    let run = await this.operations.reload(input.runId)
    if (run.targetIndex !== input.expectedTargetIndex) {
      throw new InvariantViolationException(
        'notification_projection_promotion_target_confirmation_mismatch'
      )
    }
    if (run.status === 'completed') {
      await this.operations.assertCompletedPromotion({
        runId: run.id,
        targetId: run.targetId,
        actorId: input.actorId,
        reason,
      })
      await this.assertAliasesAtCompletedTarget(run)
      return { status: 'completed', run }
    }
    if (run.status === 'ready') {
      run = await this.revalidatePromotion(run)
    }
    if (run.status === 'ready' || run.status === 'cutting_over') {
      await this.operations.beginCutover({
        runId: run.id,
        actorId: input.actorId,
        reason,
        requestedAt: this.now(),
      })
      run = await this.operations.reload(run.id)
    }
    if (run.status !== 'cutting_over') {
      throw new InvariantViolationException(
        `notification_projection_run_not_promotable:${run.status}`
      )
    }
    await this.operations.finalizeCutover(
      run,
      new Date(this.now().getTime() + this.rollbackWindowMs),
      () => this.cutoverAliases(run)
    )
    run = await this.operations.reload(run.id)
    if (run.status !== 'completed') {
      throw new InvariantViolationException(
        `notification_projection_promotion_unhandled_state:${run.status}`
      )
    }
    return { status: 'completed', run }
  }

  private async revalidatePromotion(
    run: NotificationProjectionRun
  ): Promise<NotificationProjectionRun> {
    const s1 = await this.operations.captureS1(run.id)
    run = await this.operations.reload(run.id)
    const catchup = await this.operations.catchupState(run, s1)
    if (!catchup.caughtUp) {
      throw new InvariantViolationException('notification_projection_promotion_catchup_incomplete')
    }
    const reconciliation = await this.reconciler.reconcile(run, { repair: false })
    if (!reconciliation.passed) {
      throw new InvariantViolationException(
        'notification_projection_promotion_reconciliation_failed'
      )
    }
    run = await this.operations.reload(run.id)
    if (run.status !== 'ready') {
      throw new InvariantViolationException(
        `notification_projection_promotion_revalidation_state_invalid:${run.status}`
      )
    }
    return run
  }

  private async cutoverAliases(run: NotificationProjectionRun): Promise<void> {
    if (!run.sourceIndex) {
      throw new InvariantViolationException('notification_projection_source_index_missing')
    }
    const [readIndices, writeIndices] = await Promise.all([
      this.admin.aliasIndices(this.aliases.readAlias),
      this.admin.aliasIndices(this.aliases.writeAlias),
    ])
    const readState = aliasState(readIndices, run.sourceIndex, run.targetIndex)
    const writeState = aliasState(writeIndices, run.sourceIndex, run.targetIndex)
    if (readState === 'target' && writeState === 'target') {
      return
    }
    if (readState !== 'source' || writeState !== 'source') {
      throw new InvariantViolationException('notification_projection_alias_state_inconsistent')
    }
    await this.admin.swapAliases({
      sourceIndex: run.sourceIndex,
      targetIndex: run.targetIndex,
      readAlias: this.aliases.readAlias,
      writeAlias: this.aliases.writeAlias,
    })
  }

  private async assertAliasesAtCompletedTarget(run: NotificationProjectionRun): Promise<void> {
    const [readIndices, writeIndices] = await Promise.all([
      this.admin.aliasIndices(this.aliases.readAlias),
      this.admin.aliasIndices(this.aliases.writeAlias),
    ])
    if (
      readIndices.length !== 1 ||
      readIndices[0] !== run.targetIndex ||
      writeIndices.length !== 1 ||
      writeIndices[0] !== run.targetIndex
    ) {
      throw new InvariantViolationException('notification_projection_completed_alias_mismatch')
    }
  }
}
