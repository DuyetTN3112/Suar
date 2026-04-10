import { BaseCommand } from '#actions/shared/base_command'
import type { DeleteProjectDTO } from '../dtos/request/delete_project_dto.js'
import TaskRepository from '#infra/tasks/repositories/task_repository'
import { DateTime } from 'luxon'
import CacheService from '#infra/cache/cache_service'
import emitter from '@adonisjs/core/services/emitter'
import { enforcePolicy } from '#actions/shared/enforce_policy'
import { canDeleteProject } from '#domain/projects/project_permission_policy'
import UserRepository from '#infra/users/repositories/user_repository'
import OrganizationUserRepository from '#infra/organizations/repositories/organization_user_repository'
import ProjectRepository from '#infra/projects/repositories/project_repository'
import ForbiddenException from '#exceptions/forbidden_exception'

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

    const deletedProjectEvent = await this.executeInTransaction(async (trx) => {
      // 1. Load project
      const project = await ProjectRepository.findActiveForUpdate(dto.project_id, trx)

      // Optional scope guard for adapters that require current organization context.
      if (dto.current_organization_id && project.organization_id !== dto.current_organization_id) {
        throw new ForbiddenException('Dự án không thuộc tổ chức hiện tại')
      }

      // 2. Check permissions and incomplete tasks via pure rule
      const user = await UserRepository.findNotDeletedOrFail(userId, trx)
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
        await ProjectRepository.hardDelete(project, trx)
      } else {
        project.deleted_at = DateTime.now()
        await ProjectRepository.save(project, trx)
      }

      // 6. Log audit trail
      await this.logAudit('delete', 'project', project.id, oldValues, {
        deleted_at: project.deleted_at,
        reason: dto.reason,
        permanent: dto.permanent,
      })

      return {
        projectId: project.id,
        organizationId: project.organization_id,
      }
    })

    // Emit domain event
    void emitter.emit('project:deleted', {
      projectId: deletedProjectEvent.projectId,
      organizationId: deletedProjectEvent.organizationId,
      deletedBy: userId,
    })

    // Invalidate project caches after transaction
    await CacheService.deleteByPattern(`organization:tasks:*`)
  }
}
