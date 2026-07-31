import type { CreateTaskStatusDTO } from '../../dtos/request/task_status_dtos.js'

import { AuditAction, EntityType } from '#modules/audit/public_contracts/audit_constants'
import { auditPublicApi } from '#modules/audit/public_contracts/audit_log_writer'
import ConflictException from '#modules/errors/public_contracts/conflict_exception'
import UnauthorizedException from '#modules/errors/public_contracts/unauthorized_exception'
import { BaseCommand } from '#modules/tasks/actions/base_command'
import { settleTaskPostCommitEffects } from '#modules/tasks/actions/commands/internal/settle_task_post_commit_effects'
import type { TaskCachePort } from '#modules/tasks/actions/ports/outbound/task_cache_port'
import type { TaskExternalDependencies } from '#modules/tasks/actions/ports/outbound/task_external_dependencies'
import type { TaskActionContext } from '#modules/tasks/actions/task_action_context'
import type { TaskStatusRecord } from '#modules/tasks/types/task_records'

/**
 * Command: Create a new task status for an organization.
 *
 * Business rules:
 * - Slug must be unique within organization
 * - If is_default=true, unset other defaults
 *
 * Pattern: FETCH → DECIDE → PERSIST
 */
export default class CreateTaskStatusCommand extends BaseCommand<CreateTaskStatusDTO, TaskStatusRecord> {
  constructor(
    protected override execCtx: TaskActionContext,
    private readonly cache: TaskCachePort,
    private readonly taskExternalDependencies: TaskExternalDependencies
  ) {
    super(execCtx, taskExternalDependencies.transactions)
  }

  async handle(dto: CreateTaskStatusDTO): Promise<TaskStatusRecord> {
    return this.execute(dto)
  }

  async execute(dto: CreateTaskStatusDTO): Promise<TaskStatusRecord> {
    const userId = this.execCtx.userId
    if (!userId) {
      throw new UnauthorizedException()
    }

    const status = await this.taskExternalDependencies.transactions.run(async (trx) => {
      // ── FETCH ──────────────────────────────────────────────────────────
      if (dto.project_id) {
        await this.taskExternalDependencies.project.ensureProjectBelongsToOrganization(
          dto.project_id,
          dto.organization_id,
          trx
        )
      }
      const slugExists =
        await this.taskExternalDependencies.lifecycle.taskStatusSlugExists(
        dto.organization_id,
        dto.slug,
        undefined,
        trx,
        dto.project_id ?? undefined
      )

      // ── DECIDE ─────────────────────────────────────────────────────────
      if (slugExists) {
        throw new ConflictException(`Slug '${dto.slug}' đã tồn tại trong tổ chức này`)
      }
      // ── PERSIST ────────────────────────────────────────────────────────
      const persistedStatus =
        await this.taskExternalDependencies.lifecycle.createStatus(
        {
          organization_id: dto.organization_id,
          project_id: dto.project_id,
          name: dto.name,
          slug: dto.slug,
          category: dto.category,
          color: dto.color,
          icon: dto.icon ?? null,
          description: dto.description ?? null,
          sort_order: dto.sort_order,
          is_default: false,
          is_system: false,
        },
        trx
      )

      await auditPublicApi.log(
        {
          user_id: userId,
          action: AuditAction.CREATE,
          entity_type: EntityType.TASK_STATUS,
          entity_id: persistedStatus.id,
          new_values: persistedStatus,
        },
        this.execCtx,
        { trx, critical: true }
      )

      return persistedStatus
    })

    await settleTaskPostCommitEffects({
      operation: 'task_status.create',
      context: {
        taskStatusId: status.id,
        organizationId: dto.organization_id,
        projectId: dto.project_id,
      },
      effects: [
        {
          name: 'cache.metadata.invalidate_now',
          run: () =>
            this.cache.invalidateAfterTaskCollectionMetadataChanged(dto.organization_id),
        },
      ],
    })

    return status
  }
}
