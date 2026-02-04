import emitter from '@adonisjs/core/services/emitter'

import type { DeleteProjectDTO } from '../dtos/request/delete_project_dto.js'
import { DefaultProjectDependencies } from '../ports/project_external_dependencies_impl.js'

import { auditPublicApi } from '#actions/audit/public_api'
import { enforcePolicy } from '#actions/authorization/public_api'
import { BaseCommand } from '#actions/projects/base_command'
import CacheService from '#infra/cache/cache_service'
import * as projectMutations from '#infra/projects/repositories/write/project_mutations'
import { PolicyResult as PR } from '#modules/policies/domain/policy_result'
import { canDeleteProject } from '#modules/projects/domain/project_permission_policy'

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
      const project = await projectMutations.findActiveForUpdateRecord(dto.project_id, trx)

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
      const oldValues = { ...project }

      // 5. Perform delete (soft or permanent)
      const deletedProject = dto.isPermanentDelete()
        ? await projectMutations.hardDeleteByIdRecord(project.id, trx)
        : await projectMutations.softDeleteByIdRecord(project.id, trx)

      // 6. Log audit trail
      if (this.execCtx.userId) {
        await auditPublicApi.write(this.execCtx, {
          user_id: this.execCtx.userId,
          action: 'delete',
          entity_type: 'project',
          entity_id: project.id,
          old_values: oldValues,
          new_values: {
            deleted_at: deletedProject.deleted_at,
            reason: dto.reason,
            permanent: dto.permanent,
          },
        })
      }

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
