import TaskWorkflowTransition from '#models/task_workflow_transition'
import TaskStatusRepository from '#infra/tasks/repositories/task_status_repository'
import TaskWorkflowTransitionRepository from '#infra/tasks/repositories/task_workflow_transition_repository'
import AuditLog from '#models/mongo/audit_log'
import type { UpdateWorkflowDTO } from '../dtos/request/task_status_dtos.js'
import type { ExecutionContext } from '#types/execution_context'
import db from '@adonisjs/lucid/services/db'
import { AuditAction, EntityType } from '#constants/audit_constants'
import UnauthorizedException from '#exceptions/unauthorized_exception'
import ValidationException from '#exceptions/validation_exception'

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
export default class UpdateWorkflowCommand {
  constructor(protected execCtx: ExecutionContext) {}

  async execute(dto: UpdateWorkflowDTO): Promise<TaskWorkflowTransition[]> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const trx = await db.transaction()

    try {
      // ── FETCH ──────────────────────────────────────────────────────────
      const statuses = await TaskStatusRepository.findByOrganization(dto.organization_id, trx)
      const statusIds = new Set(statuses.map((s) => s.id))

      const oldTransitions = await TaskWorkflowTransitionRepository.findByOrganization(
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
      await TaskWorkflowTransitionRepository.deleteByOrganization(dto.organization_id, trx)

      // Insert new transitions
      const newTransitions: TaskWorkflowTransition[] = []
      for (const t of dto.transitions) {
        const transition = await TaskWorkflowTransition.create(
          {
            organization_id: dto.organization_id,
            from_status_id: t.from_status_id,
            to_status_id: t.to_status_id,
            conditions: t.conditions,
          },
          { client: trx }
        )
        newTransitions.push(transition)
      }

      await AuditLog.create({
        user_id: userId,
        action: AuditAction.UPDATE,
        entity_type: EntityType.WORKFLOW,
        entity_id: dto.organization_id,
        old_values: { transitions: oldTransitions.map((t) => t.toJSON()) },
        new_values: { transitions: newTransitions.map((t) => t.toJSON()) },
        ip_address: this.execCtx.ip,
        user_agent: this.execCtx.userAgent,
      })

      await trx.commit()
      return newTransitions
    } catch (error) {
      await trx.rollback()
      throw error
    }
  }
}
