import InvariantViolationException from '#modules/errors/public_contracts/invariant_violation_exception'
import type { NotificationProjectionAliases } from '#modules/notifications/actions/ports/outbound/notification_projection_writer'
import type { NotificationProjectionRollbackPlan } from '#modules/notifications/domain/notification_projection_lifecycle'

interface NotificationProjectionRollbackOperations {
  rollbackPlan(targetIndex: string, now: Date): Promise<NotificationProjectionRollbackPlan>
  beginRollback(
    plan: NotificationProjectionRollbackPlan,
    input: { actorId: string; reason: string; now: Date }
  ): Promise<void>
  finalizeRollback(
    plan: NotificationProjectionRollbackPlan,
    input: { actorId: string; reason: string; now: Date },
    cutover: () => Promise<void>
  ): Promise<void>
}

interface NotificationProjectionRollbackAdmin {
  aliasIndices(alias: string): Promise<string[]>
  swapAliases(input: {
    sourceIndex: string
    targetIndex: string
    readAlias: string
    writeAlias: string
  }): Promise<void>
}

function aliasesPointOnlyTo(indices: string[], expectedIndex: string): boolean {
  return indices.length === 1 && indices[0] === expectedIndex
}

export interface NotificationProjectionRollbackResult {
  status: 'completed' | 'already_completed'
  previousPrimaryIndex: string
  primaryIndex: string
}

export class RollbackNotificationProjectionCommand {
  private readonly operations: NotificationProjectionRollbackOperations
  private readonly admin: NotificationProjectionRollbackAdmin
  private readonly aliases: NotificationProjectionAliases
  private readonly now: () => Date

  constructor(options: {
    operations: NotificationProjectionRollbackOperations
    admin: NotificationProjectionRollbackAdmin
    aliases: NotificationProjectionAliases
    now?: () => Date
  }) {
    this.operations = options.operations
    this.admin = options.admin
    this.aliases = options.aliases
    this.now = options.now ?? (() => new Date())
  }

  async execute(input: {
    actorId: string
    reason: string
    expectedCurrentIndex: string
    rollbackTargetIndex: string
  }): Promise<NotificationProjectionRollbackResult> {
    const reason = input.reason.trim()
    if (reason.length < 10 || reason.length > 500) {
      throw new RangeError('Projection rollback reason must contain 10 to 500 characters')
    }
    if (input.expectedCurrentIndex === input.rollbackTargetIndex) {
      throw new RangeError('Projection rollback current and target indices must be different')
    }
    const now = this.now()
    const plan = await this.operations.rollbackPlan(input.rollbackTargetIndex, now)
    const [readIndices, writeIndices] = await Promise.all([
      this.admin.aliasIndices(this.aliases.readAlias),
      this.admin.aliasIndices(this.aliases.writeAlias),
    ])

    if (plan.alreadyPrimary) {
      if (
        !aliasesPointOnlyTo(readIndices, plan.rollbackTargetIndex) ||
        !aliasesPointOnlyTo(writeIndices, plan.rollbackTargetIndex)
      ) {
        throw new InvariantViolationException(
          'notification_projection_rollback_alias_state_inconsistent'
        )
      }
      if (
        plan.rollbackApprovalActorId !== input.actorId ||
        plan.rollbackApprovalReason !== reason
      ) {
        throw new InvariantViolationException('notification_projection_rollback_approval_conflict')
      }
      return {
        status: 'already_completed',
        previousPrimaryIndex: plan.previousPrimaryIndex ?? input.expectedCurrentIndex,
        primaryIndex: plan.rollbackTargetIndex,
      }
    }
    if (plan.currentPrimaryIndex !== input.expectedCurrentIndex) {
      throw new InvariantViolationException(
        'notification_projection_rollback_current_confirmation_mismatch'
      )
    }
    const aliasesOnCurrent =
      aliasesPointOnlyTo(readIndices, plan.currentPrimaryIndex) &&
      aliasesPointOnlyTo(writeIndices, plan.currentPrimaryIndex)
    const aliasesOnTarget =
      aliasesPointOnlyTo(readIndices, plan.rollbackTargetIndex) &&
      aliasesPointOnlyTo(writeIndices, plan.rollbackTargetIndex)
    if (!aliasesOnCurrent && !aliasesOnTarget) {
      throw new InvariantViolationException(
        'notification_projection_rollback_alias_state_inconsistent'
      )
    }
    await this.operations.beginRollback(plan, {
      actorId: input.actorId,
      reason,
      now,
    })
    await this.operations.finalizeRollback(
      plan,
      {
        actorId: input.actorId,
        reason,
        now,
      },
      async () => {
        const [currentReadIndices, currentWriteIndices] = await Promise.all([
          this.admin.aliasIndices(this.aliases.readAlias),
          this.admin.aliasIndices(this.aliases.writeAlias),
        ])
        const aliasesOnCurrentAtFence =
          aliasesPointOnlyTo(currentReadIndices, plan.currentPrimaryIndex) &&
          aliasesPointOnlyTo(currentWriteIndices, plan.currentPrimaryIndex)
        const aliasesOnTargetAtFence =
          aliasesPointOnlyTo(currentReadIndices, plan.rollbackTargetIndex) &&
          aliasesPointOnlyTo(currentWriteIndices, plan.rollbackTargetIndex)
        if (aliasesOnTargetAtFence) {
          return
        }
        if (!aliasesOnCurrentAtFence) {
          throw new InvariantViolationException(
            'notification_projection_rollback_alias_state_inconsistent'
          )
        }
        await this.admin.swapAliases({
          sourceIndex: plan.currentPrimaryIndex,
          targetIndex: plan.rollbackTargetIndex,
          readAlias: this.aliases.readAlias,
          writeAlias: this.aliases.writeAlias,
        })
      }
    )

    return {
      status: 'completed',
      previousPrimaryIndex: plan.currentPrimaryIndex,
      primaryIndex: plan.rollbackTargetIndex,
    }
  }
}
