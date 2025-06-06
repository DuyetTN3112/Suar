import { BaseCommand } from '#actions/shared/base_command'
import type { UpdateProjectDTO } from '../dtos/request/update_project_dto.js'
import Project from '#models/project'
import type { DatabaseId } from '#types/database'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import BusinessLogicException from '#exceptions/business_logic_exception'
import User from '#models/user'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import ProjectMemberRepository from '#infra/projects/repositories/project_member_repository'
import { canUpdateProjectFields } from '#domain/projects/project_permission_policy'
import ForbiddenException from '#exceptions/forbidden_exception'

/**
 * Command to update an existing project
 *
 * Business Rules:
 * - Owner can update all fields
 * - Superadmin can update all fields
 * - Manager can update: description, start_date, end_date, status
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
    const userId = this.getCurrentUserId()

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

      // 2. Check permissions via pure rule
      const actor = await User.findOrFail(userId)
      const orgMembership = await OrganizationUserRepository.findMembership(
        project.organization_id,
        userId,
        trx
      )
      const projectMember = await ProjectMemberRepository.findMember(dto.project_id, userId, trx)
      const actorProjectRole = projectMember?.project_role ?? null

      const fieldResult = canUpdateProjectFields(
        {
          actorId: userId,
          actorSystemRole: actor.system_role,
          actorOrgRole: orgMembership?.org_role ?? null,
          actorProjectRole,
          projectCreatorId: project.creator_id,
          projectOwnerId: project.owner_id ?? '',
          projectOrganizationId: project.organization_id,
        },
        dto.getUpdatedFields()
      )
      if (!fieldResult.allowed) {
        throw new ForbiddenException(fieldResult.reason)
      }

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
        updatedBy: userId,
        changes: updateData,
      })

      // 8. Invalidate project caches after commit
      void CacheService.deleteByPattern(`organization:tasks:*`)

      return project
    })
  }

  /**
   * Get tracked field values for audit
   */
  private getTrackedFields(project: Project): Record<string, unknown> {
    return {
      name: project.name,
      description: project.description,
      status: project.status,
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
