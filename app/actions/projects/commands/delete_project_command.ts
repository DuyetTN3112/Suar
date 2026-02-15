import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import { BaseCommand } from '#actions/shared/base_command'
import type { DeleteProjectDTO } from '../dtos/delete_project_dto.js'
import Project from '#models/project'
import type { DatabaseId } from '#types/database'
import { DateTime } from 'luxon'
import PermissionService from '#services/permission_service'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import ForbiddenException from '#exceptions/forbidden_exception'
import BusinessLogicException from '#exceptions/business_logic_exception'

/**
 * Command to delete a project (soft delete by default)
 *
 * Business Rules:
 * - Only owner or superadmin can delete projects
 * - Warns if project has incomplete tasks
 * - Soft delete by default (sets deleted_at timestamp)
 * - Permanent delete option available (use with caution)
 *
 * @extends {BaseCommand<DeleteProjectDTO, void>}
 */
export default class DeleteProjectCommand extends BaseCommand<DeleteProjectDTO> {
  /**
   * Execute the command
   *
   * @param dto - Validated DeleteProjectDTO
   */
  async handle(dto: DeleteProjectDTO): Promise<void> {
    const user = this.getCurrentUser()

    let deletedProjectId: DatabaseId
    let organizationId: DatabaseId

    await this.executeInTransaction(async (trx) => {
      // 1. Load project
      const project = await Project.query({ client: trx })
        .where('id', dto.project_id)
        .whereNull('deleted_at')
        .forUpdate()
        .firstOrFail()

      deletedProjectId = project.id
      organizationId = project.organization_id

      // 2. Check permissions (owner or superadmin only)
      await this.validateDeletePermission(user.id, project)

      // 3. Check for incomplete tasks
      await this.checkIncompleteTasks(project.id, trx)

      // 4. Store old values for audit
      const oldValues = project.toJSON()

      // 5. Perform delete (soft or permanent)
      if (dto.isPermanentDelete()) {
        await project.useTransaction(trx).delete()
      } else {
        project.deleted_at = DateTime.now()
        await project.useTransaction(trx).save()
      }

      // 6. Log audit trail
      await this.logAudit('delete', 'project', project.id, oldValues, {
        deleted_at: project.deleted_at,
        reason: dto.reason,
        permanent: dto.permanent,
      })
    })

    // Emit domain event
    void emitter.emit('project:deleted', {
      projectId: deletedProjectId!,
      organizationId: organizationId!,
      deletedBy: user.id,
    })

    // Invalidate project caches after transaction
    await CacheService.deleteByPattern(`organization:tasks:*`)
  }

  /**
   * Validate user has permission to delete project.
   * Allowed: project owner, project creator, org admin/owner, system superadmin.
   */
  private async validateDeletePermission(userId: DatabaseId, project: Project): Promise<void> {
    const canManage = await PermissionService.canManageProject(
      userId,
      project.owner_id,
      project.creator_id,
      project.organization_id
    )

    if (!canManage) {
      throw new ForbiddenException('Chỉ owner hoặc admin mới có thể xóa dự án')
    }
  }

  /**
   * Check for incomplete tasks and warn user
   */
  private async checkIncompleteTasks(
    projectId: DatabaseId,
    trx: TransactionClientContract
  ): Promise<void> {
    const incompleteTasks = (await trx
      .from('tasks')
      .where('project_id', projectId)
      .whereNull('deleted_at')
      .whereNotIn('status_id', [
        // Assuming these are "completed" status IDs
        // Adjust based on your task_status table
        3, // completed
        4, // cancelled
      ])
      .count('* as total')
      .first()) as { total?: string | number } | null

    const count = Number(incompleteTasks?.total ?? 0)

    if (count > 0) {
      throw new BusinessLogicException(
        `Dự án có ${String(count)} công việc chưa hoàn thành. ` +
          `Vui lòng hoàn thành hoặc hủy các công việc trước khi xóa dự án.`
      )
    }
  }
}
