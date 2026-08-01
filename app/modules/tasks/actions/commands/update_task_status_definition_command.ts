import type { UpdateTaskStatusDTO } from '../dtos/request/task_status_dtos.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import { enforcePolicy } from '#modules/authorization/public_contracts/policy_enforcer'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import NotFoundException from '#modules/errors/public_contracts/not_found_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import { settleTaskPostCommitEffects } from '#modules/tasks/actions/services/task_post_commit_effect_settler'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import { canEditStatus } from '#modules/tasks/domain/task_status_rules'
import type { TaskStatusRecord } from '#modules/tasks/types/task_records'

/**
 * Command: Update an existing task status definition.
 *
 * Business rules:
 * - System statuses cannot have their category changed
 * - Slug must remain unique within organization
 * - If setting is_default=true, unset other defaults
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class UpdateTaskStatusDefinitionCommand {
  constructor(
    protected execCtx: TaskActionContext,
    private readonly cache: TaskCachePort,
    private readonly taskExternalDependencies: TaskExternalDependencies
  ) {}

  async execute(dto: UpdateTaskStatusDTO): Promise<TaskStatusRecord> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const updatedStatus =
      await this.taskExternalDependencies.transactions.run(async (trx) => {
      // ── FETCH ──────────────────────────────────────────────────────────
      const status = await this.taskExternalDependencies.lifecycle.lockStatus(
        dto.status_id,
        dto.organization_id,
        trx
      )

      if (!status) {
        throw new NotFoundException('Trạng thái task không tồn tại')
      }

      // ── DECIDE ─────────────────────────────────────────────────────────
      enforcePolicy(
        canEditStatus({
          isSystem: status.is_system,
          changingCategory: dto.isChangingCategory,
        })
      )

      // Check slug uniqueness if changing
      if (dto.slug && dto.slug !== status.slug) {
        const slugExists =
          await this.taskExternalDependencies.lifecycle.taskStatusSlugExists(
          dto.organization_id,
          dto.slug,
          dto.status_id,
          trx
        )
        if (slugExists) {
          throw new ConflictException(`Slug '${dto.slug}' đã tồn tại trong tổ chức này`)
        }
      }

      // ── PERSIST ────────────────────────────────────────────────────────
      const oldValues = { ...status }

      const updateData: Record<string, unknown> = {}
      if (dto.name !== undefined) updateData['name'] = dto.name
      if (dto.slug !== undefined) updateData['slug'] = dto.slug
      if (dto.category !== undefined) updateData['category'] = dto.category
      if (dto.color !== undefined) updateData['color'] = dto.color
      if (dto.icon !== undefined) updateData['icon'] = dto.icon
      if (dto.description !== undefined) updateData['description'] = dto.description
      if (dto.sort_order !== undefined) updateData['sort_order'] = dto.sort_order

      // Handle is_default: if setting to true, unset others first
      if (dto.is_default === true && !status.is_default) {
        await this.taskExternalDependencies.lifecycle.unsetDefaultStatuses(
          dto.organization_id,
          trx
        )
        updateData['is_default'] = true
      } else if (dto.is_default === false) {
        updateData['is_default'] = false
      }

      const persistedStatus = await this.taskExternalDependencies.lifecycle.updateStatus(
        status.id,
        status.organization_id,
        updateData,
        trx
      )

      await auditPublicApi.log(
        {
          user_id: userId,
          action: AuditAction.UPDATE,
          entity_type: EntityType.TASK_STATUS,
          entity_id: status.id,
          old_values: oldValues,
          new_values: persistedStatus,
        },
        this.execCtx,
        { trx, critical: true }
      )

      return persistedStatus
    })

    await settleTaskPostCommitEffects({
      operation: 'task_status.update',
      context: {
        taskStatusId: updatedStatus.id,
        organizationId: dto.organization_id,
      },
      effects: [
        {
          name: 'cache.metadata.invalidate_now',
          run: () =>
            this.cache.invalidateAfterTaskCollectionMetadataChanged(dto.organization_id),
        },
      ],
    })

    return updatedStatus
  }
}
