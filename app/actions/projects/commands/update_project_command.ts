import { BaseCommand } from '#actions/shared/base_command'
import type { UpdateProjectDTO } from '../dtos/update_project_dto.js'
import Project from '#models/project'
import type { DatabaseId } from '#types/database'
import PermissionService from '#services/permission_service'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import BusinessLogicException from '#exceptions/business_logic_exception'
import ForbiddenException from '#exceptions/forbidden_exception'

/**
 * Command to update an existing project
 *
 * Business Rules:
 * - Owner can update all fields
 * - Superadmin can update all fields
 * - Manager can update: description, start_date, end_date, status_id
 * - Logs all field changes to audit trail
 *
 * @extends {BaseCommand<UpdateProjectDTO, Project>}
 */
export default class UpdateProjectCommand extends BaseCommand<UpdateProjectDTO, Project> {
  /**
   * Execute the command
   *
   * @param dto - Validated UpdateProjectDTO
   * @returns Updated project
   */
  async handle(dto: UpdateProjectDTO): Promise<Project> {
    const user = this.getCurrentUser()

    // Check if there are any updates
    if (!dto.hasUpdates()) {
      throw new BusinessLogicException('Không có thay đổi nào để cập nhật')
    }

    return await this.executeInTransaction(async (trx) => {
      // 1. Load project with lock (prevents concurrent updates)
      const project = await Project.query({ client: trx })
        .where('id', dto.project_id)
        .whereNull('deleted_at')
        .forUpdate()
        .firstOrFail()

      // 2. Check permissions
      await this.validatePermissions(user.id, project, dto)

      // 3. Store old values for audit
      const oldValues = this.getTrackedFields(project)

      // 4. Update project fields
      const updateData = dto.toObject()
      project.merge(updateData)
      await project.useTransaction(trx).save()

      // 5. Get new values
      const newValues = this.getTrackedFields(project)

      // 6. Log audit trail for each changed field
      await this.logFieldChanges(project.id, oldValues, newValues, dto.getUpdatedFields())

      // 7. Emit domain event
      void emitter.emit('project:updated', {
        project,
        updatedBy: user.id,
        changes: updateData,
      })

      // 8. Invalidate project caches after commit
      void CacheService.deleteByPattern(`organization:tasks:*`)

      return project
    })
  }

  /**
   * Validate user permissions based on their role.
   * Owner, creator, org admin/owner, system superadmin can update everything.
   * Manager can only update specific fields.
   */
  private async validatePermissions(
    userId: DatabaseId,
    project: Project,
    dto: UpdateProjectDTO
  ): Promise<void> {
    // Owner, creator, org admin/owner, or system superadmin can update everything
    const canManage = await PermissionService.canManageProject(
      userId,
      project.owner_id,
      project.creator_id,
      project.organization_id
    )

    if (canManage) {
      return
    }

    // Check if user is manager
    const isManager = project.manager_id === userId

    if (isManager) {
      // Manager can only update specific fields
      const allowedFields = ['description', 'start_date', 'end_date', 'status_id']
      const attemptedFields = dto.getUpdatedFields()
      const unauthorizedFields = attemptedFields.filter((f) => !allowedFields.includes(f))

      if (unauthorizedFields.length > 0) {
        throw new ForbiddenException(
          `Manager chỉ có thể cập nhật: ${allowedFields.join(', ')}. ` +
            `Không được phép cập nhật: ${unauthorizedFields.join(', ')}`
        )
      }
      return
    }

    // No permission
    throw new ForbiddenException('Bạn không có quyền cập nhật dự án này')
  }

  /**
   * Get tracked field values for audit
   */
  private getTrackedFields(project: Project): Record<string, unknown> {
    return {
      name: project.name,
      description: project.description,
      status_id: project.status_id,
      start_date: project.start_date,
      end_date: project.end_date,
      manager_id: project.manager_id,
      owner_id: project.owner_id,
      visibility: project.visibility,
      budget: project.budget,
    }
  }

  /**
   * Log changes for each updated field
   */
  private async logFieldChanges(
    projectId: DatabaseId,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    updatedFields: string[]
  ): Promise<void> {
    for (const field of updatedFields) {
      if (oldValues[field] !== newValues[field]) {
        await this.logAudit(
          'update',
          'project',
          projectId,
          { [field]: oldValues[field] },
          {
            [field]: newValues[field],
          }
        )
      }
    }
  }
}
