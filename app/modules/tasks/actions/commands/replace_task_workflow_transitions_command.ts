import type { UpdateWorkflowDTO } from '../dtos/request/task_status_dtos.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import ValidationException from '#modules/errors/public_contracts/validation_exception'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import type { TaskWorkflowTransitionRecord } from '#modules/tasks/types/task_records'

/**
 * Command: Replace the entire workflow (transitions) for an organization.
 *
 * Strategy: DELETE all existing transitions, INSERT new ones (replace-all).
 * This is simpler and safer than diff-based updates.
 *
 * Business rules:
 * - All referenced status IDs must belong to the organization
 * - No self-transitions (from === to)
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class ReplaceTaskWorkflowTransitionsCommand {
  constructor(
    protected execCtx: TaskActionContext,
    private readonly taskExternalDependencies: TaskExternalDependencies
  ) {}

  async execute(dto: UpdateWorkflowDTO): Promise<TaskWorkflowTransitionRecord[]> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    return this.taskExternalDependencies.transactions.run(async (trx) => {
      // ── FETCH ──────────────────────────────────────────────────────────
      const statuses = await this.taskExternalDependencies.lifecycle.listStatuses(
        dto.organization_id,
        trx
      )
      const statusIds = new Set(statuses.map((s) => s.id))

      const oldTransitions =
        await this.taskExternalDependencies.lifecycle.listWorkflowTransitions(
        dto.organization_id,
        trx
      )

      // ── DECIDE ─────────────────────────────────────────────────────────
      // Validate all referenced status IDs exist in this org
      for (const t of dto.transitions) {
        if (!statusIds.has(t.from_status_id)) {
          throw new ValidationException(
            `from_status_id '${t.from_status_id}' không thuộc tổ chức này`
          )
        }
        if (!statusIds.has(t.to_status_id)) {
          throw new ValidationException(`to_status_id '${t.to_status_id}' không thuộc tổ chức này`)
        }
      }

      // ── PERSIST ────────────────────────────────────────────────────────
      // Delete all old transitions
      await this.taskExternalDependencies.lifecycle.deleteWorkflowTransitions(
        dto.organization_id,
        trx
      )

      // Insert new transitions
      const newTransitions: TaskWorkflowTransitionRecord[] = []
      for (const t of dto.transitions) {
        const transition =
          await this.taskExternalDependencies.lifecycle.createWorkflowTransition(
          {
            organization_id: dto.organization_id,
            from_status_id: t.from_status_id,
            to_status_id: t.to_status_id,
            conditions: t.conditions,
          },
          trx
        )
        newTransitions.push(transition)
      }

      await auditPublicApi.log(
        {
          user_id: userId,
          action: AuditAction.UPDATE,
          entity_type: EntityType.WORKFLOW,
          entity_id: dto.organization_id,
          old_values: { transitions: oldTransitions },
          new_values: { transitions: newTransitions },
        },
        this.execCtx,
        { trx, critical: true }
      )

      return newTransitions
    })
  }
}
