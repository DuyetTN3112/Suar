import { HttpContext } from '@adonisjs/core/http'
import { BaseCommand } from '#actions/shared/base_command'
import { UpdateProjectDTO } from '../dtos/index.js'
import Project from '#models/project'
import db from '@adonisjs/lucid/services/db'

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
  constructor(ctx: HttpContext) {
    super(ctx)
  }

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
      throw new Error('Không có thay đổi nào để cập nhật')
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

      return project
    })
  }

  /**
   * Validate user permissions based on their role
   */
  private async validatePermissions(
    userId: number,
    project: Project,
    dto: UpdateProjectDTO
  ): Promise<void> {
    const isOwner = project.owner_id === userId
    const isCreator = project.creator_id === userId

    // Check if user is superadmin
    const isSuperAdmin = await this.checkIsSuperAdmin(userId, project.organization_id)

    // Owner, creator, or superadmin can update everything
    if (isOwner || isCreator || isSuperAdmin) {
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
        throw new Error(
          `Manager chỉ có thể cập nhật: ${allowedFields.join(', ')}. ` +
            `Không được phép cập nhật: ${unauthorizedFields.join(', ')}`
        )
      }
      return
    }

    // No permission
    throw new Error('Bạn không có quyền cập nhật dự án này')
  }

  /**
   * Check if user is superadmin of the organization
   */
  private async checkIsSuperAdmin(userId: number, organizationId: number): Promise<boolean> {
    // Check database directly
    const org = await db
      .from('organization_users')
      .where('user_id', userId)
      .where('organization_id', organizationId)
      .where('role_id', 1)
      .where('status', 'approved')
      .first()

    return !!org
  }

  /**
   * Get tracked field values for audit
   */
  private getTrackedFields(project: Project): Record<string, any> {
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
    projectId: number,
    oldValues: Record<string, any>,
    newValues: Record<string, any>,
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
