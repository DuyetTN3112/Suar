import { HttpContext } from '@adonisjs/core/http'
import { BaseCommand } from '#actions/shared/base_command'
import { DeleteProjectDTO } from '../dtos/index.js'
import Project from '#models/project'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'

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
export default class DeleteProjectCommand extends BaseCommand<DeleteProjectDTO, void> {
  constructor(ctx: HttpContext) {
    super(ctx)
  }

  /**
   * Execute the command
   *
   * @param dto - Validated DeleteProjectDTO
   */
  async handle(dto: DeleteProjectDTO): Promise<void> {
    const user = this.getCurrentUser()

    await this.executeInTransaction(async (trx) => {
      // 1. Load project
      const project = await Project.query({ client: trx })
        .where('id', dto.project_id)
        .whereNull('deleted_at')
        .forUpdate()
        .firstOrFail()

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
  }

  /**
   * Validate user has permission to delete project
   */
  private async validateDeletePermission(userId: number, project: Project): Promise<void> {
    const isOwner = project.owner_id === userId
    const isCreator = project.creator_id === userId

    if (isOwner || isCreator) {
      return
    }

    // Check if user is superadmin of the organization
    const isSuperAdmin = await this.checkIsSuperAdmin(userId, project.organization_id)

    if (!isSuperAdmin) {
      throw new Error('Chỉ owner hoặc superadmin mới có thể xóa dự án')
    }
  }

  /**
   * Check if user is superadmin of the organization
   */
  private async checkIsSuperAdmin(userId: number, organizationId: number): Promise<boolean> {
    const result = await db
      .from('organization_users')
      .where('user_id', userId)
      .where('organization_id', organizationId)
      .where('role_id', 1)
      .where('status', 'approved')
      .first()

    return !!result
  }

  /**
   * Check for incomplete tasks and warn user
   */
  private async checkIncompleteTasks(projectId: number, trx: unknown): Promise<void> {
    const incompleteTasks = await trx
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
      .first()

    const count = incompleteTasks?.total || 0

    if (count > 0) {
      throw new Error(
        `Dự án có ${count} công việc chưa hoàn thành. ` +
          `Vui lòng hoàn thành hoặc hủy các công việc trước khi xóa dự án.`
      )
    }
  }
}
