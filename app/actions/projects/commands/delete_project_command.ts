import { BaseCommand } from '#actions/shared/base_command'
import type { DeleteProjectDTO } from '../dtos/delete_project_dto.js'
import Project from '#models/project'
import TaskRepository from '#repositories/task_repository'
import type { DatabaseId } from '#types/database'
import { DateTime } from 'luxon'
import CacheService from '#services/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import { enforcePolicy } from '#domain/shared/enforce_policy'
import { canDeleteProject } from '#domain/projects/project_permission_policy'
import User from '#models/user'
import OrganizationUserRepository from '#repositories/organization_user_repository'

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
    const userId = this.getCurrentUserId()

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

      // 2. Check permissions and incomplete tasks via pure rule
      const user = await User.findOrFail(userId)
      const orgMembership = await OrganizationUserRepository.findMembership(
        project.organization_id,
        userId,
        trx
      )
      const incompleteTaskCount = await TaskRepository.countIncompleteByProject(project.id, trx)

      enforcePolicy(
        canDeleteProject({
          actorId: userId,
          actorSystemRole: user.system_role,
          actorOrgRole: orgMembership?.org_role ?? null,
          projectOwnerId: project.owner_id ?? '',
          projectCreatorId: project.creator_id,
          incompleteTaskCount,
        })
      )

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
      deletedBy: userId,
    })

    // Invalidate project caches after transaction
    await CacheService.deleteByPattern(`organization:tasks:*`)
  }
}
