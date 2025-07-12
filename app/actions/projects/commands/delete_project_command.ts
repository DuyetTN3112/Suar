import emitter from '@adonisjs/core/services/emitter'
import { DateTime } from 'luxon'

import type { DeleteProjectDTO } from '../dtos/request/delete_project_dto.js'

import { enforcePolicy } from '#actions/authorization/enforce_policy'
import { BaseCommand } from '#actions/shared/base_command'
import { PolicyResult as PR } from '#domain/policies/policy_result'
import { canDeleteProject } from '#domain/projects/project_permission_policy'
import CacheService from '#infra/cache/cache_service'
import ProjectRepository from '#infra/projects/repositories/project_repository'

import { DefaultProjectDependencies } from '../ports/project_external_dependencies_impl.js'

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
        enforcePolicy(PR.deny('Dự án không thuộc tổ chức hiện tại'))
      }

      // 2. Check permissions and incomplete tasks via pure rule
      const user = await DefaultProjectDependencies.user.findActorInfo(userId, trx)
      const actorOrgRole = await DefaultProjectDependencies.organization.getMembershipRole(
        project.organization_id,
        userId,
        trx
      )
      const incompleteTaskCount = await DefaultProjectDependencies.task.countIncompleteByProject(
        project.id,
        trx
      )

      enforcePolicy(
        canDeleteProject({
          actorId: userId,
          actorSystemRole: user.system_role,
          actorOrgRole,
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
